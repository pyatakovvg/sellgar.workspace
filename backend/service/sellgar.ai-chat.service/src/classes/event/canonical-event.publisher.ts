import { Injectable } from '@nestjs/common';
import type { Server as HttpServer } from 'node:http';
import { Namespace, Server } from 'socket.io';

import { ChatEntity } from '../chat/chat.entity';
import { MessageEntity } from '../message/message.entity';

export type CanonicalEvent =
  | { readonly type: 'chat.created' | 'chat.updated'; readonly chat: ChatEntity }
  | { readonly type: 'message.created' | 'message.updated'; readonly message: MessageEntity };

@Injectable()
export class CanonicalEventPublisher {
  private namespace: Namespace | null = null;
  private sequence = 0;

  connect(httpServer: HttpServer, origins: readonly string[]): void {
    this.namespace = new Server(httpServer, { cors: { origin: [...origins], credentials: true } }).of('/chat');
  }

  publish(events: readonly CanonicalEvent[]): void {
    if (this.namespace === null) {
      throw new Error('Socket.IO publisher не подключён к HTTP server.');
    }

    for (const event of events) {
      const envelope = {
        ...event,
        sequence: ++this.sequence,
        occurredAt: new Date().toISOString(),
      };

      this.namespace.emit(event.type, envelope);
    }
  }
}
