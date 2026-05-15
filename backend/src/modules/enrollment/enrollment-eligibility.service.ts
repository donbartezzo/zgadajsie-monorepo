import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentEligibilityService {
  constructor(private prisma: PrismaService) {}

  async isTrusted(userId: string, organizerId: string): Promise<boolean> {
    const relation = await this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId: organizerId, targetUserId: userId },
      },
      select: { isTrusted: true },
    });
    return relation?.isTrusted === true;
  }

  async isBannedByOrganizer(userId: string, organizerId: string): Promise<boolean> {
    const relation = await this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId: organizerId, targetUserId: userId },
      },
      select: { isBanned: true },
    });
    return relation?.isBanned === true;
  }

  async isEligibleForOpenEnrollment(userId: string, organizerId: string): Promise<boolean> {
    const [banned, trusted] = await Promise.all([
      this.isBannedByOrganizer(userId, organizerId),
      this.isTrusted(userId, organizerId),
    ]);
    return !banned && trusted;
  }

  async canAddGuests(userId: string, organizerId: string): Promise<boolean> {
    const trusted = await this.isTrusted(userId, organizerId);
    return trusted;
  }

  async getGuestCount(eventId: string, addedByUserId: string): Promise<number> {
    return this.prisma.eventEnrollment.count({
      where: {
        eventId,
        addedByUserId,
        wantsIn: true,
      },
    });
  }
}
