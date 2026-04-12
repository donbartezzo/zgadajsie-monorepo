import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EnrollmentEligibilityService } from '../participation/enrollment-eligibility.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CoverImagesModule } from '../cover-images/cover-images.module';
import { CitySubscriptionsModule } from '../city-subscriptions/city-subscriptions.module';
import { SlotModule } from '../slots/slot.module';
import { EventRealtimeModule } from '../realtime/event-realtime.module';

@Module({
  imports: [
    NotificationsModule,
    VouchersModule,
    CoverImagesModule,
    CitySubscriptionsModule,
    SlotModule,
    EventRealtimeModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EnrollmentEligibilityService],
  exports: [EventsService],
})
export class EventsModule {}
