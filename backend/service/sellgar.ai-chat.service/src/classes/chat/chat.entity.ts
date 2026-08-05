import { ChatMode, ChatProcessingType } from './chat.model';

export interface ChatEntity {
  readonly correlationId: string;
  readonly id: string;
  readonly prevId?: string;
  readonly number: number;
  readonly title: string;
  readonly mode: ChatMode;
  readonly processingStatus: {
    readonly type: ChatProcessingType;
    readonly reason: string;
  };
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
