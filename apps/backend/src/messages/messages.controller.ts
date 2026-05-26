import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { MessagesService, TaskMessage } from './messages.service';

interface CreateMessageRequest {
  feladatId: number;
  userName: string;
  message: string;
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('task/:feladatId/with-seen')
  async getUzenetek(
    @Param('feladatId', ParseIntPipe) feladatId: number,
    @Query('userName') userName: string,
  ): Promise<TaskMessage[]> {
    return this.messagesService.getUzenetek(feladatId, userName);
  }

  @Post()
  async uzenet(@Body() body: CreateMessageRequest): Promise<{ success: boolean }> {
    const success = await this.messagesService.uzenet(
      body.feladatId,
      body.userName,
      body.message,
    );
    return { success };
  }

  @Get('task/:feladatId')
  async getMessages(
    @Param('feladatId', ParseIntPipe) feladatId: number,
  ): Promise<TaskMessage[]> {
    return this.messagesService.getMessages(feladatId);
  }
}
