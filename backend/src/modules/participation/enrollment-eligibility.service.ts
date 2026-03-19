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

    // Check if user has any participations (current or past) with this organizer
    const anyParticipation = await this.prisma.eventParticipation.count({
      where: {
        userId,
        event: {
          organizerId,
          status: { not: 'CANCELLED' },
        },
      },
    });

    if (anyParticipation > 0) {
      return false;
    }

    // This check is now redundant but kept for clarity
    // Past participations with assigned slot are already included in anyParticipation
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
