import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller('events/:eventId/chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('messages')
  getMessages(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(eventId, page ? +page : 1, limit ? +limit : 50);
  }
}
