import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentEligibilityService {
  constructor(private prisma: PrismaService) {}

  async isNewUser(userId: string, organizerId: string): Promise<boolean> {
    const trusted = await this.prisma.organizerUserRelation.findUnique({
      where: {
        organizerUserId_targetUserId: { organizerUserId: organizerId, targetUserId: userId },
      },
      select: { isTrusted: true },
    });
    if (trusted?.isTrusted) {
      return false;
    }

    // Count past participations with assigned slot (confirmed attendance)
    const pastParticipation = await this.prisma.eventParticipation.count({
      where: {
        userId,
        slot: { isNot: null },
        event: {
          organizerId,
          status: { not: 'CANCELLED' },
          endsAt: { lt: new Date() },
        },
      },
    });

    return pastParticipation === 0;
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
    const [banned, isNew] = await Promise.all([
      this.isBannedByOrganizer(userId, organizerId),
      this.isNewUser(userId, organizerId),
    ]);
    return !banned && !isNew;
  }

  async canAddGuests(userId: string, organizerId: string): Promise<boolean> {
    const isNew = await this.isNewUser(userId, organizerId);
    return !isNew;
  }

  async getGuestCount(eventId: string, addedByUserId: string): Promise<number> {
    return this.prisma.eventParticipation.count({
      where: {
        eventId,
        addedByUserId,
        isGuest: true,
        wantsIn: true,
      },
    });
  }
}
