import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';

import { GroqAgentGateway } from '../agent/groq-agent.gateway';
import { ChatMapper } from '../chat/chat.mapper';
import { ChatModel } from '../chat/chat.model';
import { ChatRepository } from '../chat/chat.repository';
import { CanonicalEventPublisher } from '../event/canonical-event.publisher';
import { MessageMapper } from './message.mapper';
import { MessageModel } from './message.model';
import { MessageRepository } from './message.repository';
import { MessageService } from './message.service';

describe('MessageService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts parallel Message without changing Chat processing state', async () => {
    const order: string[] = [];
    const manager = { query: jest.fn(async () => undefined) };
    const chat = createChat();
    const dataSource = {
      transaction: jest.fn(async (operation: (value: typeof manager) => Promise<unknown>) => {
        const result = await operation(manager);
        order.push('commit');
        return result;
      }),
    } as unknown as DataSource;
    const chats = {
      lockById: jest.fn(async () => chat),
      findByCorrelationId: jest.fn(async () => null),
      save: jest.fn(),
    } as unknown as ChatRepository;
    const messages = {
      findByCorrelationId: jest.fn(async () => null),
      findLast: jest.fn(async () => null),
      create: jest.fn<(values: Partial<MessageModel>) => MessageModel>((values) => values as MessageModel),
      save: jest.fn<(message: MessageModel) => Promise<MessageModel>>(async (message) => message),
    } as unknown as MessageRepository;
    const events = {
      publish: jest.fn(() => order.push('publish')),
    } as unknown as CanonicalEventPublisher;
    const agent = { respond: jest.fn() } as unknown as GroqAgentGateway;
    const config = { get: jest.fn(() => 60_000) } as unknown as ConfigService;
    const service = new MessageService(
      dataSource,
      chats,
      messages,
      agent,
      events,
      new ChatMapper(),
      new MessageMapper(),
      config,
    );

    await service.send({
      correlationId: 'message-operation-1',
      chatId: chat.id,
      text: 'Покажи продажи',
      createdAt: '2026-08-01T09:01:00.000Z',
    });

    expect(order).toEqual(['commit', 'publish']);
    expect(chats.save).not.toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'message.created',
        message: expect.objectContaining({
          correlationId: 'message-operation-1',
          deliveryStatus: { type: 'sent', reason: 'accepted-by-backend' },
        }),
      }),
    ]);
  });

  it('stores Agent response and publishes canonical Message', async () => {
    const chat = createChat('sequential');
    const stored: MessageModel[] = [
      Object.assign(new MessageModel(), {
        correlationId: 'previous-user-message',
        chatId: chat.id,
        type: 'user',
        text: 'Запомни число два.',
        position: 1,
        deliveryType: 'delivered',
      }),
      Object.assign(new MessageModel(), {
        correlationId: 'previous-agent-message',
        chatId: chat.id,
        type: 'response',
        text: 'Запомнил.',
        position: 2,
        deliveryType: 'delivered',
      }),
    ];
    const manager = { query: jest.fn(async () => undefined) };
    const dataSource = {
      transaction: jest.fn(async (operation: (value: typeof manager) => Promise<unknown>) => operation(manager)),
    } as unknown as DataSource;
    const chats = {
      lockById: jest.fn(async () => chat),
      findByCorrelationId: jest.fn(async () => null),
      save: jest.fn(async (value: ChatModel) => value),
    } as unknown as ChatRepository;
    const messages = {
      findByCorrelationId: jest.fn(async (correlationId: string) =>
        stored.find((message) => message.correlationId === correlationId) ?? null,
      ),
      findByChatId: jest.fn(async () => [...stored]),
      findLast: jest.fn(async () => stored.at(-1) ?? null),
      findSuccessor: jest.fn(async () => null),
      create: jest.fn<(values: Partial<MessageModel>) => MessageModel>((values) =>
        Object.assign(new MessageModel(), values),
      ),
      save: jest.fn(async (message: MessageModel) => {
        if (!stored.includes(message)) {
          stored.push(message);
        }

        return message;
      }),
    } as unknown as MessageRepository;
    const events = { publish: jest.fn() } as unknown as CanonicalEventPublisher;
    const agent = {
      respond: jest.fn(async () => 'Четыре.'),
    } as unknown as GroqAgentGateway;
    const config = { get: jest.fn(() => 0) } as unknown as ConfigService;
    const service = new MessageService(
      dataSource,
      chats,
      messages,
      agent,
      events,
      new ChatMapper(),
      new MessageMapper(),
      config,
    );

    await service.send({
      correlationId: 'message-operation-2',
      chatId: chat.id,
      text: 'Сколько будет два плюс два?',
      createdAt: '2026-08-01T09:01:00.000Z',
    });
    await jest.runAllTimersAsync();

    expect(agent.respond).toHaveBeenCalledWith([
      { role: 'user', content: 'Запомни число два.' },
      { role: 'assistant', content: 'Запомнил.' },
      { role: 'user', content: 'Сколько будет два плюс два?' },
    ]);
    expect(events.publish).toHaveBeenLastCalledWith([
      expect.objectContaining({ type: 'message.updated' }),
      expect.objectContaining({
        type: 'message.created',
        message: expect.objectContaining({ type: 'response', text: 'Четыре.' }),
      }),
      expect.objectContaining({
        type: 'chat.updated',
        chat: expect.objectContaining({ processingStatus: { type: 'idle', reason: 'response-received' } }),
      }),
    ]);
  });
});

const createChat = (mode: ChatModel['mode'] = 'parallel'): ChatModel =>
  Object.assign(new ChatModel(), {
    number: 1,
    id: '73e53c76-21ae-48b8-ad68-d7ec62353943',
    correlationId: 'chat-operation-1',
    prevId: null,
    title: 'Новый чат 1',
    mode,
    processingType: 'idle',
    processingReason: 'no-active-request',
    unreadCount: 0,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T09:00:00.000Z'),
  });
