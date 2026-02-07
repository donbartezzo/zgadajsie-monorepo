import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { EventReminderCron } from './event-reminder.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, PushService, EventReminderCron],
  exports: [NotificationsService, EmailService, PushService],
})
export class NotificationsModule {}
