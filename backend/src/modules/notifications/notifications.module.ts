import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { EventReminderCron } from './event-reminder.cron';
import { EnrollmentLotteryCron } from './enrollment-lottery.cron';
import { ApprovalReminderCron } from './approval-reminder.cron';
import { SlotModule } from '../slots/slot.module';
import { EventRealtimeModule } from '../realtime/event-realtime.module';

@Module({
  imports: [ScheduleModule.forRoot(), SlotModule, EventRealtimeModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    PushService,
    EventReminderCron,
    EnrollmentLotteryCron,
    ApprovalReminderCron,
  ],
  exports: [NotificationsService, EmailService, PushService],
})
export class NotificationsModule {}
