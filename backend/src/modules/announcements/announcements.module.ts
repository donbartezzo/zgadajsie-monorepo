import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementDispatcherService } from './announcement-dispatcher.service';

@Module({
  imports: [NotificationsModule, ChatModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementDispatcherService],
  exports: [AnnouncementDispatcherService],
})
export class AnnouncementsModule {}
