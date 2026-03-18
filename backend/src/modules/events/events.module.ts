import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CoverImagesModule } from '../cover-images/cover-images.module';
import { CitySubscriptionsModule } from '../city-subscriptions/city-subscriptions.module';
import { SlotModule } from '../slots/slot.module';

@Module({
  imports: [
    NotificationsModule,
    VouchersModule,
    CoverImagesModule,
    CitySubscriptionsModule,
    SlotModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
