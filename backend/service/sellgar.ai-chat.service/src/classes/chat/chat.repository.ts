import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { ChatModel } from './chat.model';

@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(ChatModel)
    private readonly chats: Repository<ChatModel>,
  ) {}

  findById(id: string, manager?: EntityManager): Promise<ChatModel | null> {
    return this.repository(manager).findOneBy({ id });
  }

  findByCorrelationId(correlationId: string, manager?: EntityManager): Promise<ChatModel | null> {
    return this.repository(manager).findOneBy({ correlationId });
  }

  findByCorrelationIds(correlationIds: readonly string[]): Promise<ChatModel[]> {
    if (correlationIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.chats
      .createQueryBuilder('chat')
      .where('chat.correlation_id IN (:...correlationIds)', { correlationIds })
      .orderBy('chat.created_at', 'DESC')
      .addOrderBy('chat.id', 'DESC')
      .getMany();
  }

  findNewest(manager: EntityManager): Promise<ChatModel | null> {
    return this.repository(manager)
      .createQueryBuilder('chat')
      .orderBy('chat.created_at', 'DESC')
      .addOrderBy('chat.id', 'DESC')
      .getOne();
  }

  async findPage(beforeId: string | undefined, limit: number): Promise<ChatModel[]> {
    const query = this.chats
      .createQueryBuilder('chat')
      .orderBy('chat.created_at', 'DESC')
      .addOrderBy('chat.id', 'DESC')
      .take(limit);

    if (beforeId !== undefined) {
      const anchor = await this.findById(beforeId);

      if (anchor === null) {
        return [];
      }

      query.andWhere('(chat.created_at < :createdAt OR (chat.created_at = :createdAt AND chat.id < :id))', {
        createdAt: anchor.createdAt,
        id: anchor.id,
      });
    }

    return query.getMany();
  }

  lockById(id: string, manager: EntityManager): Promise<ChatModel | null> {
    return this.repository(manager)
      .createQueryBuilder('chat')
      .setLock('pessimistic_write')
      .where('chat.id = :id', { id })
      .getOne();
  }

  save(chat: ChatModel, manager: EntityManager): Promise<ChatModel> {
    return this.repository(manager).save(chat);
  }

  create(values: Partial<ChatModel>, manager: EntityManager): ChatModel {
    return this.repository(manager).create(values);
  }

  private repository(manager?: EntityManager): Repository<ChatModel> {
    return manager?.getRepository(ChatModel) ?? this.chats;
  }
}
