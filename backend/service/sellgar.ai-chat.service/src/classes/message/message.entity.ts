import { MessageDeliveryType, MessageDisplayType, MessageType } from './message.model';

export interface MessageEntity {
  readonly correlationId: string;
  readonly id: string;
  readonly chatId: string;
  readonly prevId?: string;
  readonly type: MessageType;
  readonly text: string;
  readonly position: number;
  readonly deliveryStatus?: { readonly type: MessageDeliveryType; readonly reason: string };
  readonly displayStatus?: { readonly type: MessageDisplayType; readonly reason: string };
  readonly createdAt: string;
  readonly updatedAt: string;
}
