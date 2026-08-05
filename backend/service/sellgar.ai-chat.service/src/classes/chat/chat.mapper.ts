import { Injectable } from '@nestjs/common';

import { ChatEntity } from './chat.entity';
import { ChatModel } from './chat.model';

@Injectable()
export class ChatMapper {
  toEntity(chat: ChatModel): ChatEntity {
    return {
      correlationId: chat.correlationId,
      id: chat.id,
      ...(chat.prevId === null ? {} : { prevId: chat.prevId }),
      number: chat.number,
      title: chat.title,
      mode: chat.mode,
      processingStatus: { type: chat.processingType, reason: chat.processingReason },
      unreadCount: chat.unreadCount,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    };
  }
}
