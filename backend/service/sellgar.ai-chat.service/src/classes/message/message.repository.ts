import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { MessageModel } from './message.model';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(MessageModel)
    private readonly messages: Repository<MessageModel>,
  ) {}

  findByCorrelationId(correlationId: string, manager?: EntityManager): Promise<MessageModel | null> {
    return this.repository(manager).findOneBy({ correlationId });
  }

  findByCorrelationIds(correlationIds: readonly string[]): Promise<MessageModel[]> {
    if (correlationIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.messages.find({
      where: { correlationId: In([...correlationIds]) },
      order: { chatId: 'ASC', position: 'ASC', correlationId: 'ASC' },
    });
  }

  findByChatId(chatId: string): Promise<MessageModel[]> {
    return this.messages.find({
      where: { chatId },
      order: { position: 'ASC', correlationId: 'ASC' },
    });
  }

  async findPage(chatId: string, beforeId: string | undefined, limit: number): Promise<MessageModel[]> {
    const query = this.messages
      .createQueryBuilder('message')
      .where('message.chat_id = :chatId', { chatId })
      .orderBy('message.position', 'DESC')
      .addOrderBy('message.correlation_id', 'DESC')
      .take(limit);

    if (beforeId !== undefined) {
      const anchor = await this.messages.findOneBy({ id: beforeId, chatId });

      if (anchor === null) {
        return [];
      }

      query.andWhere(
        '(message.position < :position OR (message.position = :position AND message.correlation_id < :correlationId))',
        { position: anchor.position, correlationId: anchor.correlationId },
      );
    }

    return (await query.getMany()).reverse();
  }

  async findLastByChatIds(chatIds: readonly string[]): Promise<Map<string, MessageModel>> {
    if (chatIds.length === 0) {
      return new Map();
    }

    const messages = await this.messages
      .createQueryBuilder('message')
      .distinctOn(['message.chat_id'])
      .where('message.chat_id IN (:...chatIds)', { chatIds })
      .orderBy('message.chat_id', 'ASC')
      .addOrderBy('message.position', 'DESC')
      .addOrderBy('message.correlation_id', 'DESC')
      .getMany();

    return new Map(messages.map((message) => [message.chatId, message]));
  }

  findLast(chatId: string, manager: EntityManager): Promise<MessageModel | null> {
    return this.repository(manager).findOne({ where: { chatId }, order: { position: 'DESC', correlationId: 'DESC' } });
  }

  findSuccessor(chatId: string, position: number, manager: EntityManager): Promise<MessageModel | null> {
    return this.repository(manager).findOne({ where: { chatId, position: position + 1 } });
  }

  save(message: MessageModel, manager: EntityManager): Promise<MessageModel> {
    return this.repository(manager).save(message);
  }

  create(values: Partial<MessageModel>, manager: EntityManager): MessageModel {
    return this.repository(manager).create(values);
  }

  private repository(manager?: EntityManager): Repository<MessageModel> {
    return manager?.getRepository(MessageModel) ?? this.messages;
  }
}
