import { Module } from '@nestjs/common';
import { ActivityRankController } from './activity-rank.controller';
import { ActivityRankService } from './activity-rank.service';

@Module({
  controllers: [ActivityRankController],
  providers: [ActivityRankService],
  exports: [ActivityRankService],
})
export class ActivityRankModule {}
