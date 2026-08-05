import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { CanonicalEventPublisher } from '../event/canonical-event.publisher';
import { MessageMapper } from '../message/message.mapper';
import { MessageRepository } from '../message/message.repository';
import { ChatEntity } from './chat.entity';
import { ChatMapper } from './chat.mapper';
import { ChatMode } from './chat.model';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly chats: ChatRepository,
    private readonly messages: MessageRepository,
    private readonly events: CanonicalEventPublisher,
    private readonly chatMapper: ChatMapper,
    private readonly messageMapper: MessageMapper,
  ) {}

  async create(correlationId: string, mode: ChatMode): Promise<void> {
    const created = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [correlationId]);
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['ai-chat.create']);

      const existing = await this.chats.findByCorrelationId(correlationId, manager);

      if (existing !== null) {
        if (existing.mode !== mode) {
          throw new ConflictException('Correlation identity уже принадлежит другой команде Chat.');
        }

        return null;
      }

      if ((await this.messages.findByCorrelationId(correlationId, manager)) !== null) {
        throw new ConflictException('Correlation identity уже используется.');
      }

      const previous = await this.chats.findNewest(manager);
      const chat = this.chats.create(
        {
          id: randomUUID(),
          correlationId,
          prevId: previous?.correlationId ?? null,
          title: 'Новый чат',
          mode,
          processingType: 'idle',
          processingReason: 'no-active-request',
          unreadCount: 0,
        },
        manager,
      );

      await this.chats.save(chat, manager);
      chat.title = `Новый чат ${chat.number}`;
      await this.chats.save(chat, manager);

      return this.chatMapper.toEntity(chat);
    });

    if (created !== null) {
      this.events.publish([{ type: 'chat.created', chat: created }]);
    }
  }

  async get(id: string): Promise<ChatEntity> {
    const chat = await this.chats.findById(id);

    if (chat === null) {
      throw new NotFoundException('Chat не найден.');
    }

    return this.chatMapper.toEntity(chat);
  }

  async getPage(beforeId: string | undefined, limit: number) {
    const chats = await this.chats.findPage(beforeId, limit);
    const lastMessages = await this.messages.findLastByChatIds(chats.map(({ id }) => id));

    return {
      items: chats.map((chat) => {
        const lastMessage = lastMessages.get(chat.id);

        return {
          chat: this.chatMapper.toEntity(chat),
          ...(lastMessage === undefined ? {} : { lastMessage: this.messageMapper.toEntity(lastMessage) }),
        };
      }),
    };
  }

  async find(correlationIds: readonly string[]): Promise<readonly ChatEntity[]> {
    return (await this.chats.findByCorrelationIds(correlationIds)).map((chat) => this.chatMapper.toEntity(chat));
  }
}
