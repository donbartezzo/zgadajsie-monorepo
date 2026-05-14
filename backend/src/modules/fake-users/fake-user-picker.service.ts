import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FakeUserPickerService {
  private readonly logger = new Logger(FakeUserPickerService.name);

  constructor(private prisma: PrismaService) {}

  async pickFakeUserForEvent(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        gender: true,
        organizerId: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie zostało znalezione');
    }

    // Pobierz wszystkie aktywne fake users
    const fakeUsers = await this.prisma.user.findMany({
      where: {
        accountType: 'FAKE',
        isActive: true,
      },
      select: {
        id: true,
        gender: true,
      },
    });

    if (fakeUsers.length === 0) {
      this.logger.warn(`Brak aktywnych fake users dla wydarzenia ${eventId}`);
      return null;
    }

    // Filtruj po płci (jeśli event ma ograniczenie płci)
    const genderFiltered = fakeUsers.filter((user) => {
      if (event.gender === 'ANY') return true;
      return user.gender === event.gender;
    });

    if (genderFiltered.length === 0) {
      this.logger.warn(`Brak fake users o płci ${event.gender} dla wydarzenia ${eventId}`);
      return null;
    }

    // Pobierz ID fake users którzy są już zapisani na to wydarzenie
    const enrolledUserIds = await this.prisma.eventEnrollment
      .findMany({
        where: {
          eventId,
          userId: {
            in: genderFiltered.map((u) => u.id),
          },
        },
        select: {
          userId: true,
        },
      })
      .then((enrollments) => new Set(enrollments.map((e) => e.userId)));

    // Wyklucz zapisanych (aktywnych lub wypisanych)
    const notEnrolled = genderFiltered.filter((u) => !enrolledUserIds.has(u.id));

    if (notEnrolled.length === 0) {
      this.logger.warn(
        `Wszystkie fake users o płci ${event.gender} są już zapisane na wydarzenie ${eventId}`,
      );
      return null;
    }

    // Pobierz bany od organizatora
    const bannedUserIds = await this.prisma.organizerUserRelation
      .findMany({
        where: {
          organizerUserId: event.organizerId,
          targetUserId: {
            in: notEnrolled.map((u) => u.id),
          },
          isBanned: true,
        },
        select: {
          targetUserId: true,
        },
      })
      .then((relations) => new Set(relations.map((r) => r.targetUserId)));

    // Wyklucz zbanowanych
    const notBanned = notEnrolled.filter((u) => !bannedUserIds.has(u.id));

    if (notBanned.length === 0) {
      this.logger.warn(
        `Wszystkie dostępne fake users są zbanowani przez organizatora wydarzenia ${eventId}`,
      );
      return null;
    }

    // Policz obłożenie dla każdej osoby
    const usersWithLoad = await Promise.all(
      notBanned.map(async (user) => {
        const activeEnrollmentsCount = await this.prisma.eventEnrollment.count({
          where: {
            userId: user.id,
            wantsIn: true,
          },
        });
        return {
          user,
          load: activeEnrollmentsCount,
        };
      }),
    );

    // Sortuj po obciążeniu (rosnąco)
    usersWithLoad.sort((a, b) => a.load - b.load);

    // Znajdź minimalne obciążenie
    const minLoad = usersWithLoad[0].load;

    // Wybierz tylko te z minimalnym obciążeniem
    const minLoadUsers = usersWithLoad.filter((u) => u.load === minLoad);

    // Losowy tiebreak
    const selected = minLoadUsers[Math.floor(Math.random() * minLoadUsers.length)];

    this.logger.log(
      `Wybrano fake user ${selected.user.id} dla wydarzenia ${eventId} (obciążenie: ${selected.load})`,
    );

    return selected.user.id;
  }
}
