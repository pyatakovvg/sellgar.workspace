import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';

import { MessageService } from '@/classes/message/message.service';

import { CorrelationQueryDto } from '../chat/dto/correlation-query/correlation-query.dto';
import { DisplayMessageDto } from './dto/display-message/display-message.dto';
import { MessagePageQueryDto } from './dto/message-page-query/message-page-query.dto';
import { SendMessageDto } from './dto/send-message/send-message.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messages: MessageService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async send(@Body() command: SendMessageDto): Promise<void> {
    await this.messages.send(command);
  }

  @Post('display')
  @HttpCode(HttpStatus.ACCEPTED)
  async display(@Body() command: DisplayMessageDto): Promise<void> {
    await this.messages.display(command.correlationId, command.chatId);
  }

  @Get()
  getPage(@Query() query: MessagePageQueryDto) {
    return this.messages.getPage(query.chatId, query.beforeId, query.limit);
  }

  @Get('by-correlation')
  find(@Query() query: CorrelationQueryDto) {
    return this.messages.find(query.correlationId);
  }
}
