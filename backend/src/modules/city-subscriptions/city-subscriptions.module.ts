import { Module } from '@nestjs/common';
import { CitySubscriptionsController } from './city-subscriptions.controller';
import { CitySubscriptionsService } from './city-subscriptions.service';

@Module({
  controllers: [CitySubscriptionsController],
  providers: [CitySubscriptionsService],
  exports: [CitySubscriptionsService],
})
export class CitySubscriptionsModule {}
