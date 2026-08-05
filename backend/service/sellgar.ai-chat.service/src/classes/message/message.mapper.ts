import { Injectable } from '@nestjs/common';

import { MessageEntity } from './message.entity';
import { MessageModel } from './message.model';

@Injectable()
export class MessageMapper {
  toEntity(message: MessageModel): MessageEntity {
    return {
      correlationId: message.correlationId,
      id: message.id,
      chatId: message.chatId,
      ...(message.prevId === null ? {} : { prevId: message.prevId }),
      type: message.type,
      text: message.text,
      position: message.position,
      ...(message.deliveryType === null || message.deliveryReason === null
        ? {}
        : { deliveryStatus: { type: message.deliveryType, reason: message.deliveryReason } }),
      ...(message.displayType === null || message.displayReason === null
        ? {}
        : { displayStatus: { type: message.displayType, reason: message.displayReason } }),
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }
}
