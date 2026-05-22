import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { SlotModule } from '../slots/slot.module';
import { EventRealtimeModule } from '../realtime/event-realtime.module';
import { FakeUsersModule } from '../fake-users/fake-users.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    NotificationsModule,
    PaymentsModule,
    SlotModule,
    EventRealtimeModule,
    FakeUsersModule,
    ChatModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentEligibilityService],
  exports: [EnrollmentService, EnrollmentEligibilityService],
})
export class EnrollmentModule {}
