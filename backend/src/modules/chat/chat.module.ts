import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatNotificationService } from './chat-notification.service';
import { ChatNotificationCron } from './chat-notification.cron';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ChatController],
  imports: [NotificationsModule],
  providers: [ChatService, ChatGateway, ChatNotificationService, ChatNotificationCron],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
