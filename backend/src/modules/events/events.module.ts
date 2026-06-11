import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EnrollmentEligibilityService } from '../enrollment/enrollment-eligibility.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CitySubscriptionsModule } from '../city-subscriptions/city-subscriptions.module';
import { SlotModule } from '../slots/slot.module';
import { EventRealtimeModule } from '../realtime/event-realtime.module';
import { FakeUsersModule } from '../fake-users/fake-users.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    NotificationsModule,
    VouchersModule,
    CitySubscriptionsModule,
    SlotModule,
    EventRealtimeModule,
    FakeUsersModule,
    UsersModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EnrollmentEligibilityService],
  exports: [EventsService],
})
export class EventsModule {}
