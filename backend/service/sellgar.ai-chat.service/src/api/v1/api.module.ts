import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroqAgentGateway } from '@/classes/agent/groq-agent.gateway';
import { ChatModel } from '@/classes/chat/chat.model';
import { ChatMapper } from '@/classes/chat/chat.mapper';
import { ChatRepository } from '@/classes/chat/chat.repository';
import { ChatService } from '@/classes/chat/chat.service';
import { CanonicalEventPublisher } from '@/classes/event/canonical-event.publisher';
import { MessageModel } from '@/classes/message/message.model';
import { MessageMapper } from '@/classes/message/message.mapper';
import { MessageRepository } from '@/classes/message/message.repository';
import { MessageService } from '@/classes/message/message.service';

import { ChatController } from './chat/chat.controller';
import { MessageController } from './message/message.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatModel, MessageModel])],
  controllers: [ChatController, MessageController],
  providers: [
    GroqAgentGateway,
    ChatMapper,
    ChatRepository,
    ChatService,
    MessageMapper,
    MessageRepository,
    MessageService,
    CanonicalEventPublisher,
  ],
  exports: [CanonicalEventPublisher],
})
export class ApiModule {}
