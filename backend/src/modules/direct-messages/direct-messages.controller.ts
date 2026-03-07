import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { DirectMessagesService } from './direct-messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller('direct-messages')
export class DirectMessagesController {
  constructor(private directMessagesService: DirectMessagesService) {}

  @Get('conversations')
  getMyConversations(@Req() req: { user: { id: string } }) {
    return this.directMessagesService.getMyConversations(req.user.id);
  }

  @Post('conversations')
  getOrCreateConversation(
    @Req() req: { user: { id: string } },
    @Body() body: { recipientId: string; eventId?: string },
  ) {
    return this.directMessagesService.getOrCreateConversation(
      req.user.id,
      body.recipientId,
      body.eventId,
    );
  }

  @Get('conversations/:id')
  getConversation(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.directMessagesService.getConversation(id, req.user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directMessagesService.getMessages(
      id,
      req.user.id,
      page ? +page : 1,
      limit ? +limit : 50,
    );
  }
}
