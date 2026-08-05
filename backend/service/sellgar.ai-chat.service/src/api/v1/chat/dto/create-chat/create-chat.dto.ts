import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { ChatMode } from '@/classes/chat/chat.model';

export class CreateChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  correlationId: string;

  @IsIn(['parallel', 'sequential'])
  mode: ChatMode;
}
