import { Module } from '@nestjs/common';
import { EventSeriesController } from './event-series.controller';
import { EventSeriesService } from './event-series.service';
import { EventSeriesGenerator } from './event-series.generator';
import { EventSeriesCron } from './event-series.cron';
import { SlotModule } from '../slots/slot.module';
import { CoverImagesModule } from '../cover-images/cover-images.module';
import { CitySubscriptionsModule } from '../city-subscriptions/city-subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FakeUsersModule } from '../fake-users/fake-users.module';

@Module({
  imports: [
    SlotModule,
    CoverImagesModule,
    CitySubscriptionsModule,
    NotificationsModule,
    FakeUsersModule,
  ],
  controllers: [EventSeriesController],
  providers: [EventSeriesService, EventSeriesGenerator, EventSeriesCron],
  exports: [EventSeriesService],
})
export class EventSeriesModule {}
