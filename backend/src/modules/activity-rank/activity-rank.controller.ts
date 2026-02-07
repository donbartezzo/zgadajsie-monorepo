import { Controller, Get, UseGuards } from '@nestjs/common';
import { ActivityRankService } from './activity-rank.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('activity-rank')
export class ActivityRankController {
  constructor(private activityRankService: ActivityRankService) {}

  @Get('me')
  getMyRank(@CurrentUser() user: any) {
    return this.activityRankService.getUserRank(user.id);
  }
}
