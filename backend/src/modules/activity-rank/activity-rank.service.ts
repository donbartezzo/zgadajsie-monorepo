import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityRankService {
  constructor(private prisma: PrismaService) {}

  async getUserRank(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const participationCount = await this.prisma.eventParticipation.count({
      where: {
        userId,
        status: { in: ['ACCEPTED', 'PARTICIPANT'] },
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
