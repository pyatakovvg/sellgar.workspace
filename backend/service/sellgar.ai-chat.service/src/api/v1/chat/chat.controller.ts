import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';

import { ChatService } from '@/classes/chat/chat.service';

import { ChatPageQueryDto } from './dto/chat-page-query/chat-page-query.dto';
import { CorrelationQueryDto } from './dto/correlation-query/correlation-query.dto';
import { CreateChatDto } from './dto/create-chat/create-chat.dto';

@Controller('chats')
export class ChatController {
  constructor(private readonly chats: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() command: CreateChatDto): Promise<void> {
    await this.chats.create(command.correlationId, command.mode);
  }

  @Get()
  getPage(@Query() query: ChatPageQueryDto) {
    return this.chats.getPage(query.beforeId, query.limit);
  }

  @Get('by-correlation')
  find(@Query() query: CorrelationQueryDto) {
    return this.chats.find(query.correlationId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.chats.get(id);
  }
}
