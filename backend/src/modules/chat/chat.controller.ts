import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

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

  @Get('members')
  getMembers(@Param('eventId') eventId: string) {
    return this.chatService.getChatMembers(eventId);
  }

  @Post('ban/:userId')
  banUser(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.banUser(eventId, userId, user.id);
  }

  @Delete('ban/:userId')
  unbanUser(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.chatService.unbanUser(eventId, userId);
  }

  @Get('private/conversations')
  getOrganizerConversations(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.chatService.getOrganizerConversations(eventId, user.id);
  }

  @Get('private/:userId/messages')
  getPrivateMessages(
    @Param('eventId') eventId: string,
    @Param('userId') otherUserId: string,
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getPrivateMessages(
      eventId,
      user.id,
      otherUserId,
      page ? +page : 1,
      limit ? +limit : 50,
    );
  }
}
