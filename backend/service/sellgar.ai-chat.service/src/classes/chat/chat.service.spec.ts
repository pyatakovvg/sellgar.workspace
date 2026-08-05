import { describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';

import { CanonicalEventPublisher } from '../event/canonical-event.publisher';
import { MessageMapper } from '../message/message.mapper';
import { MessageRepository } from '../message/message.repository';
import { ChatMapper } from './chat.mapper';
import { ChatModel } from './chat.model';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  it('publishes canonical Chat only after transaction commit', async () => {
    const order: string[] = [];
    const manager = { query: jest.fn(async () => undefined) };
    const dataSource = {
      transaction: jest.fn(async (operation: (value: typeof manager) => Promise<unknown>) => {
        const result = await operation(manager);
        order.push('commit');
        return result;
      }),
    } as unknown as DataSource;
    const chats = {
      findByCorrelationId: jest.fn(async () => null),
      findNewest: jest.fn(async () => null),
      create: jest.fn<(values: Partial<ChatModel>) => ChatModel>((values) => values as ChatModel),
      save: jest.fn(async (chat: ChatModel) => {
        chat.number ??= 1;
        chat.createdAt ??= new Date('2026-08-01T09:00:00.000Z');
        chat.updatedAt ??= chat.createdAt;
        return chat;
      }),
    } as unknown as ChatRepository;
    const messages = { findByCorrelationId: jest.fn(async () => null) } as unknown as MessageRepository;
    const events = {
      publish: jest.fn(() => order.push('publish')),
    } as unknown as CanonicalEventPublisher;
    const service = new ChatService(dataSource, chats, messages, events, new ChatMapper(), new MessageMapper());

    await service.create('chat-operation-1', 'parallel');

    expect(order).toEqual(['commit', 'publish']);
    expect(events.publish).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'chat.created',
        chat: expect.objectContaining({ correlationId: 'chat-operation-1', number: 1 }),
      }),
    ]);
  });
});
