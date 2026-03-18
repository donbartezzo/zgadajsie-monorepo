import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { EmailTestService } from '../email/email-test.service';
import { PushService } from './push.service';
import { EventReminderCron } from './event-reminder.cron';
import { EnrollmentLotteryCron } from './enrollment-lottery.cron';
import { ApprovalReminderCron } from './approval-reminder.cron';
import { SlotModule } from '../slots/slot.module';

@Module({
  imports: [ScheduleModule.forRoot(), SlotModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    EmailTestService,
    PushService,
    EventReminderCron,
    EnrollmentLotteryCron,
    ApprovalReminderCron,
  ],
  exports: [NotificationsService, EmailService, PushService],
})
export class NotificationsModule {}
