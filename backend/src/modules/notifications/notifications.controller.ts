import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { MarkByGroupDto } from './dto/mark-by-group.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  @Get()
  getNotifications(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotifications(
      user.id,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('mark-by-group')
  async markByGroup(@CurrentUser() user: AuthUser, @Body() dto: MarkByGroupDto) {
    // Whitelist prefixów dla bezpieczeństwa
    const allowedPrefixes = ['chat:', 'pm:', 'app:', 'reminder:', 'announce:', 'city:'];
    const hasValidPrefix = allowedPrefixes.some((prefix) => dto.groupKey.startsWith(prefix));

    if (!hasValidPrefix) {
      throw new BadRequestException('Invalid groupKey prefix');
    }

    return this.notificationsService.markByGroupKey(user.id, dto.groupKey);
  }

  @Post('push/subscribe')
  subscribePush(
    @CurrentUser() user: AuthUser,
    @Body() subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.notificationsService.subscribePush(user.id, subscription);
  }

  @Post('push/unsubscribe')
  unsubscribePush(@CurrentUser() user: AuthUser, @Body() body: { endpoint: string }) {
    return this.notificationsService.unsubscribePush(user.id, body.endpoint);
  }

  @Post('email/send-test')
  async sendTestEmail(@CurrentUser() user: AuthUser, @Body() body: { to?: string }) {
    const to = body.to || user.email;
    await this.emailService.sendActivationEmail(to, user.displayName ?? user.email, 'test-token');
    return { success: true, message: `Test email sent to ${to}` };
  }

  // UWAGA: trasa statyczna musi być przed `:id`, inaczej `DELETE /notifications/all`
  // trafi w `@Delete(':id')` z id='all' (kolejność deklaracji = kolejność matchowania).
  @Delete('all')
  deleteAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAll(user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.delete(id, user.id);
  }
}
