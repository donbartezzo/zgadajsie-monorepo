import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { daysFromNow } from '../../common/utils/date.util';

@Injectable()
export class ActivityRankService {
  constructor(private prisma: PrismaService) {}

  async getUserRank(userId: string) {
    const thirtyDaysAgo = daysFromNow(-30);

    const participationCount = await this.prisma.eventParticipation.count({
      where: {
        userId,
        status: { in: ['APPROVED', 'CONFIRMED'] },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const organizedCount = await this.prisma.event.count({
      where: {
        organizerId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalActivity = participationCount + organizedCount;
    let rank: string;

    if (totalActivity >= 15) rank = 'VETERAN';
    else if (totalActivity >= 8) rank = 'REGULAR';
    else if (totalActivity >= 3) rank = 'ACTIVE';
    else rank = 'OCCASIONAL';

    return {
      rank,
      participationCount,
      organizedCount,
      totalActivity,
    };
  }
}
