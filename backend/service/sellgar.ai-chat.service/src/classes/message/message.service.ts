import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';

import { GroqAgentGateway } from '../agent/groq-agent.gateway';
import { ChatRepository } from '../chat/chat.repository';
import { ChatMapper } from '../chat/chat.mapper';
import { CanonicalEvent, CanonicalEventPublisher } from '../event/canonical-event.publisher';
import { MessageEntity } from './message.entity';
import { MessageMapper } from './message.mapper';
import { MessageModel } from './message.model';
import { MessageRepository } from './message.repository';

export interface SendMessageValues {
  readonly correlationId: string;
  readonly chatId: string;
  readonly text: string;
  readonly createdAt: string;
}

export interface MessageChanges {
  readonly chats: readonly import('../chat/chat.entity').ChatEntity[];
  readonly messages: readonly MessageEntity[];
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private readonly responseDelay: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly chats: ChatRepository,
    private readonly messages: MessageRepository,
    private readonly agent: GroqAgentGateway,
    private readonly events: CanonicalEventPublisher,
    private readonly chatMapper: ChatMapper,
    private readonly messageMapper: MessageMapper,
    config: ConfigService,
  ) {
    this.responseDelay = Number(config.get('RESPONSE_DELAY_MS') ?? 500);
  }

  async send(values: SendMessageValues): Promise<void> {
    const accepted = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [values.correlationId]);
      const chat = await this.chats.lockById(values.chatId, manager);

      if (chat === null) {
        throw new NotFoundException('Chat не найден.');
      }

      const existing = await this.messages.findByCorrelationId(values.correlationId, manager);

      if (existing !== null) {
        this.assertSameCommand(existing, values);

        if (existing.deliveryType !== 'rejected') {
          return null;
        }
      } else if ((await this.chats.findByCorrelationId(values.correlationId, manager)) !== null) {
        throw new ConflictException('Correlation identity уже используется.');
      }

      const now = new Date();
      const emitted: CanonicalEvent[] = [];

      if (chat.mode === 'sequential' && chat.processingType === 'processing') {
        const rejected = await this.reject(existing, values, now, manager);
        emitted.push({
          type: existing === null ? 'message.created' : 'message.updated',
          message: this.messageMapper.toEntity(rejected),
        });
        chat.updatedAt = now;
        await this.chats.save(chat, manager);
        emitted.push({ type: 'chat.updated', chat: this.chatMapper.toEntity(chat) });

        return { emitted, correlationId: null };
      }

      const acceptedMessage = await this.accept(existing, values, now, manager, emitted);

      if (chat.mode === 'sequential') {
        chat.processingType = 'processing';
        chat.processingReason = 'awaiting-response';
        chat.updatedAt = now;
        await this.chats.save(chat, manager);
        emitted.push({ type: 'chat.updated', chat: this.chatMapper.toEntity(chat) });
      }

      return { emitted, correlationId: acceptedMessage.correlationId };
    });

    if (accepted === null) {
      return;
    }

    this.events.publish(accepted.emitted);

    if (accepted.correlationId !== null) {
      setTimeout(
        () =>
          void this.process(accepted.correlationId).catch((error) =>
            this.logger.error(error instanceof Error ? error.stack : String(error)),
          ),
        this.responseDelay,
      );
    }
  }

  async display(correlationId: string, chatId: string): Promise<void> {
    const emitted = await this.dataSource.transaction(async (manager) => {
      const chat = await this.chats.lockById(chatId, manager);
      const message = await this.messages.findByCorrelationId(correlationId, manager);

      if (chat === null || message === null || message.chatId !== chatId) {
        throw new NotFoundException('Message не найден.');
      }

      if (message.type === 'user') {
        throw new ConflictException('Клиент не подтверждает display исходящего Message.');
      }

      if (message.displayType === 'displayed') {
        return [];
      }

      const now = new Date();
      message.displayType = 'displayed';
      message.displayReason = 'display-confirmed';
      message.updatedAt = now;
      chat.unreadCount = Math.max(0, chat.unreadCount - 1);
      chat.updatedAt = now;
      await this.messages.save(message, manager);
      await this.chats.save(chat, manager);

      return [
        { type: 'message.updated', message: this.messageMapper.toEntity(message) },
        { type: 'chat.updated', chat: this.chatMapper.toEntity(chat) },
      ] satisfies CanonicalEvent[];
    });

    this.events.publish(emitted);
  }

  async getPage(chatId: string, beforeId: string | undefined, limit: number) {
    const chat = await this.chats.findById(chatId);

    if (chat === null) {
      throw new NotFoundException('Chat не найден.');
    }

    return {
      chats: [this.chatMapper.toEntity(chat)],
      messages: (await this.messages.findPage(chatId, beforeId, limit)).map((message) =>
        this.messageMapper.toEntity(message),
      ),
    };
  }

  async find(correlationIds: readonly string[]): Promise<MessageChanges> {
    const messages = await this.messages.findByCorrelationIds(correlationIds);
    const chatIds = [...new Set(messages.map(({ chatId }) => chatId))];
    const chats = await Promise.all(chatIds.map((id) => this.chats.findById(id)));

    return {
      chats: chats.flatMap((chat) => (chat === null ? [] : [this.chatMapper.toEntity(chat)])),
      messages: messages.map((message) => this.messageMapper.toEntity(message)),
    };
  }

  private async accept(
    existing: MessageModel | null,
    values: SendMessageValues,
    now: Date,
    manager: EntityManager,
    emitted: CanonicalEvent[],
  ): Promise<MessageModel> {
    const tail = await this.messages.findLast(values.chatId, manager);

    if (existing === null) {
      const message = this.messages.create(
        {
          id: randomUUID(),
          correlationId: values.correlationId,
          chatId: values.chatId,
          prevId: tail?.correlationId ?? null,
          type: 'user',
          text: values.text,
          position: (tail?.position ?? 0) + 1,
          deliveryType: 'sent',
          deliveryReason: 'accepted-by-backend',
          displayType: null,
          displayReason: null,
          createdAt: new Date(values.createdAt),
          updatedAt: now,
        },
        manager,
      );
      await this.messages.save(message, manager);
      emitted.push({ type: 'message.created', message: this.messageMapper.toEntity(message) });

      return message;
    }

    if (tail !== null && tail.correlationId !== existing.correlationId) {
      const successor = await this.messages.findSuccessor(existing.chatId, existing.position, manager);

      if (successor !== null) {
        successor.prevId = existing.prevId;
        successor.updatedAt = now;
        await this.messages.save(successor, manager);
        emitted.push({ type: 'message.updated', message: this.messageMapper.toEntity(successor) });
      }

      existing.position = tail.position + 1;
      existing.prevId = tail.correlationId;
    }

    existing.deliveryType = 'sent';
    existing.deliveryReason = 'accepted-by-backend';
    existing.displayType = null;
    existing.displayReason = null;
    existing.updatedAt = now;
    await this.messages.save(existing, manager);
    emitted.push({ type: 'message.updated', message: this.messageMapper.toEntity(existing) });

    return existing;
  }

  private async reject(
    existing: MessageModel | null,
    values: SendMessageValues,
    now: Date,
    manager: EntityManager,
  ): Promise<MessageModel> {
    const tail = existing === null ? await this.messages.findLast(values.chatId, manager) : null;
    const message =
      existing ??
      this.messages.create(
        {
          id: randomUUID(),
          correlationId: values.correlationId,
          chatId: values.chatId,
          prevId: tail?.correlationId ?? null,
          type: 'user',
          text: values.text,
          position: (tail?.position ?? 0) + 1,
          createdAt: new Date(values.createdAt),
        },
        manager,
      );

    message.deliveryType = 'rejected';
    message.deliveryReason = 'sequential-turn-in-progress';
    message.updatedAt = now;
    await this.messages.save(message, manager);

    return message;
  }

  private async process(correlationId: string): Promise<void> {
    const message = await this.messages.findByCorrelationId(correlationId);

    if (message === null || message.deliveryType !== 'sent') {
      return;
    }

    const conversation = (await this.messages.findByChatId(message.chatId)).flatMap((item) => {
      if (item.deliveryType === 'rejected' || item.type === 'error') {
        return [];
      }

      return [
        {
          role: item.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: item.text,
        },
      ];
    });
    let responseType: 'error' | 'response' = 'response';
    let responseText: string;

    try {
      responseText = await this.agent.respond(conversation);
    } catch (error) {
      responseType = 'error';
      responseText = 'Не удалось получить ответ от AI. Попробуйте отправить сообщение ещё раз.';
      this.logger.error(error instanceof Error ? error.stack : String(error));
    }

    const emitted = await this.dataSource.transaction(async (manager) => {
      const current = await this.messages.findByCorrelationId(correlationId, manager);

      if (current === null || current.deliveryType !== 'sent') {
        return [];
      }

      const chat = await this.chats.lockById(current.chatId, manager);

      if (chat === null) {
        return [];
      }

      const now = new Date();
      current.deliveryType = 'delivered';
      current.deliveryReason = 'recipient-confirmed';
      current.displayType = 'displayed';
      current.displayReason = 'recipient-processed';
      current.updatedAt = now;
      await this.messages.save(current, manager);

      const tail = await this.messages.findLast(current.chatId, manager);
      const response = this.messages.create(
        {
          id: randomUUID(),
          correlationId: randomUUID(),
          chatId: current.chatId,
          prevId: tail?.correlationId ?? null,
          type: responseType,
          text: responseText,
          position: (tail?.position ?? 0) + 1,
          deliveryType: 'delivered',
          deliveryReason: responseType === 'response' ? 'generated-by-agent' : 'agent-request-failed',
          displayType: 'unread',
          displayReason: 'not-displayed',
          createdAt: now,
          updatedAt: now,
        },
        manager,
      );
      await this.messages.save(response, manager);

      chat.processingType = 'idle';
      chat.processingReason = responseType === 'response' ? 'response-received' : 'response-failed';
      chat.unreadCount += 1;
      chat.updatedAt = now;
      await this.chats.save(chat, manager);

      return [
        { type: 'message.updated', message: this.messageMapper.toEntity(current) },
        { type: 'message.created', message: this.messageMapper.toEntity(response) },
        { type: 'chat.updated', chat: this.chatMapper.toEntity(chat) },
      ] satisfies CanonicalEvent[];
    });

    this.events.publish(emitted);
  }

  private assertSameCommand(message: MessageModel, values: SendMessageValues): void {
    if (
      message.chatId !== values.chatId ||
      message.type !== 'user' ||
      message.text !== values.text ||
      message.createdAt.toISOString() !== new Date(values.createdAt).toISOString()
    ) {
      throw new ConflictException('Correlation identity уже принадлежит другой команде Message.');
    }
  }
}
