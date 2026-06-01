import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { ChatNotificationService } from './chat-notification.service';

@Injectable()
export class ChatNotificationCron {
  private readonly logger = new Logger(ChatNotificationCron.name);

  constructor(
    @Inject(forwardRef(() => ChatNotificationService))
    private readonly chatNotificationService: ChatNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingNotifications(): Promise<void> {
    this.logger.debug('Processing pending chat notifications');
    await this.chatNotificationService.processPendingNotifications();
  }
}
