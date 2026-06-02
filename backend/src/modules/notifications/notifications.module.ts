import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { PushDeliveryService } from './push-delivery.service';
import { EventReminderCron } from './event-reminder.cron';
import { EnrollmentLotteryCron } from './enrollment-lottery.cron';
import { ApprovalReminderCron } from './approval-reminder.cron';
import { NotificationEscalationCron } from './notification-escalation.cron';
import { NotificationEmailDigestCron } from './notification-email-digest.cron';
import { NotificationCleanupCron } from './notification-cleanup.cron';
import { SlotModule } from '../slots/slot.module';
import { EventRealtimeModule } from '../realtime/event-realtime.module';
import { UserRealtimeModule } from '../realtime/user-realtime.module';

@Module({
  imports: [SlotModule, EventRealtimeModule, UserRealtimeModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    PushService,
    PushDeliveryService,
    EventReminderCron,
    EnrollmentLotteryCron,
    ApprovalReminderCron,
    NotificationEscalationCron,
    NotificationEmailDigestCron,
    NotificationCleanupCron,
  ],
  exports: [NotificationsService, EmailService, PushService],
})
export class NotificationsModule {}
