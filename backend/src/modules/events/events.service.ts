import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CoverImagesService } from '../cover-images/cover-images.service';
import { CitySubscriptionsService } from '../city-subscriptions/city-subscriptions.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { getEventTimeStatus } from './event-time-status.util';
import { getEnrollmentPhase, shouldSkipPreEnrollment } from './enrollment-phase.util';
import { daysFromNow } from '../../common/utils/date.util';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
    private notificationsService: NotificationsService,
    private coverImagesService: CoverImagesService,
    private citySubscriptionsService: CitySubscriptionsService,
  ) {}

  async create(organizerId: string, dto: CreateEventDto) {
    const coverImageId = await this.resolveCoverImageId(dto.coverImageId, dto.disciplineId);

    const startsAt = new Date(dto.startsAt);
    const lotteryExecutedAt = shouldSkipPreEnrollment(startsAt) ? new Date() : null;

    const event = await this.prisma.event.create({
      data: {
        ...dto,
        startsAt,
        endsAt: new Date(dto.endsAt),
        organizerId,
        coverImageId,
        lotteryExecutedAt,
      },
      include: { discipline: true, facility: true, level: true, city: true, coverImage: true },
    });

    this.notifyCitySubscribers(event.id, event.title, event.cityId, organizerId);

    return event;
  }

  private notifyCitySubscribers(
    eventId: string,
    eventTitle: string,
    cityId: string,
    organizerId: string,
  ): void {
    setImmediate(async () => {
      try {
        const subscriberIds =
          await this.citySubscriptionsService.getSubscriberIds(cityId);
        const filtered = subscriberIds.filter((id) => id !== organizerId);
        for (const userId of filtered) {
          await this.pushService.notifyNewEventInCity(userId, eventTitle, eventId);
        }
        if (filtered.length > 0) {
          this.logger.log(
            `Notified ${filtered.length} city subscribers about new event "${eventTitle}"`,
          );
        }
      } catch (err) {
        this.logger.error(`Failed to notify city subscribers: ${(err as Error).message}`);
      }
    });
  }

  async findAll(query: EventQueryDto) {
    const { page = 1, limit = 20, citySlug, disciplineSlug, sortBy } = query;
    const now = new Date();
    const dateFrom = daysFromNow(-7, now);
    const dateTo = daysFromNow(7, now);
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'CANCELLED'] },
      visibility: 'PUBLIC',
      startsAt: { gte: dateFrom, lte: dateTo },
    };

    if (citySlug) {
      where.city = { slug: citySlug };
    }
    if (disciplineSlug) {
      where.discipline = { slug: disciplineSlug };
    }

    const orderBy: Record<string, string> =
      sortBy === 'newest' ? { createdAt: 'desc' } : { startsAt: 'asc' };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          discipline: true,
          facility: true,
          level: true,
          city: true,
          coverImage: true,
          organizer: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: {
            select: {
              participations: { where: { status: { notIn: ['WITHDRAWN', 'REJECTED'] } } },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data: events, total, page, limit };
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        discipline: true,
        facility: true,
        level: true,
        city: true,
        coverImage: true,
        organizer: { select: { id: true, displayName: true, avatarUrl: true } },
        participations: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');

    const eventTimeStatus = getEventTimeStatus(event);
    const enrollmentPhase = getEnrollmentPhase(event);

    if (!userId) return { ...event, eventTimeStatus, enrollmentPhase };

    const participation = event.participations.find((p) => p.userId === userId);

    let isBannedByOrganizer = false;
    if (event.organizerId !== userId) {
      const relation = await this.prisma.organizerUserRelation.findUnique({
        where: {
          organizerUserId_targetUserId: {
            organizerUserId: event.organizerId,
            targetUserId: userId,
          },
        },
        select: { isBanned: true },
      });
      isBannedByOrganizer = relation?.isBanned === true;
    }

    return {
      ...event,
      eventTimeStatus,
      enrollmentPhase,
      currentUserAccess: {
        isParticipant: !!participation,
        isOrganizer: event.organizerId === userId,
        participationStatus: participation?.status ?? null,
        participationId: participation?.id ?? null,
        isBannedByOrganizer,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    if (event.status !== 'ACTIVE' || new Date() >= event.startsAt) {
      throw new BadRequestException(
        'Wydarzenie nie może być edytowane — skontaktuj się z administracją serwisu.',
      );
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);

    return this.prisma.event.update({
      where: { id },
      data,
      include: { discipline: true, facility: true, level: true, city: true },
    });
  }

  async cancel(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    if (event.status === 'CANCELLED') {
      throw new BadRequestException('Wydarzenie zostało już odwołane');
    }

    // Single transaction: cancel event + refund vouchers + cleanup pending intents
    const { updated, refundedCount, cleanedUpIntents } = await this.prisma.$transaction(
      async (tx) => {
        const updatedEvent = await tx.event.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });

        // Refund paid participants via vouchers
        const paidParticipations = await tx.eventParticipation.findMany({
          where: {
            eventId: id,
            status: { in: ['PENDING', 'APPROVED', 'CONFIRMED'] },
            payments: { some: { status: 'COMPLETED' } },
          },
          include: {
            payments: {
              where: { status: 'COMPLETED' },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        let refunded = 0;
        for (const participation of paidParticipations) {
          const payment = participation.payments[0];
          if (!payment) continue;

          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'VOUCHER_REFUNDED', refundedAt: new Date() },
          });
          await tx.eventParticipation.update({
            where: { id: participation.id },
            data: { status: 'WITHDRAWN' },
          });
          await tx.organizerVoucher.create({
            data: {
              recipientUserId: participation.userId,
              organizerUserId: event.organizerId,
              eventId: id,
              amount: payment.amount,
              remainingAmount: payment.amount,
              source: 'EVENT_CANCELLATION',
              status: 'ACTIVE',
            },
          });
          refunded++;
        }

        // Cleanup pending payment intents (restore reserved vouchers)
        const pendingParticipations = await tx.eventParticipation.findMany({
          where: { eventId: id, status: { in: ['PENDING', 'APPROVED'] } },
        });

        let cleanedIntents = 0;
        for (const participation of pendingParticipations) {
          const intents = await tx.paymentIntent.findMany({
            where: { participationId: participation.id },
          });
          for (const intent of intents) {
            const reserved = intent.voucherReserved.toNumber();
            if (reserved > 0) {
              await tx.organizerVoucher.create({
                data: {
                  recipientUserId: intent.userId,
                  organizerUserId: event.organizerId,
                  amount: intent.voucherReserved,
                  remainingAmount: intent.voucherReserved,
                  source: 'MANUAL_REFUND',
                  status: 'ACTIVE',
                },
              });
            }
            await tx.paymentIntent.delete({ where: { id: intent.id } });
            cleanedIntents++;
          }
          await tx.eventParticipation.update({
            where: { id: participation.id },
            data: { status: 'WITHDRAWN' },
          });
        }

        return { updated: updatedEvent, refundedCount: refunded, cleanedUpIntents: cleanedIntents };
      },
    );

    // Notifications (fire-and-forget, outside transaction)
    const notificationErrors: string[] = [];
    const participants = await this.prisma.eventParticipation.findMany({
      where: {
        eventId: id,
        status: { in: ['PENDING', 'APPROVED', 'CONFIRMED', 'WITHDRAWN'] },
      },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });

    for (const p of participants) {
      try {
        await this.pushService.notifyEventCancelled(p.user.id, event.title, id);
      } catch (err) {
        notificationErrors.push(`push:${p.user.id}:${(err as Error).message}`);
      }
      try {
        await this.emailService.sendEventCancelledEmail(
          p.user.email,
          p.user.displayName,
          event.title,
        );
      } catch (err) {
        notificationErrors.push(`email:${p.user.email}:${(err as Error).message}`);
      }
    }

    if (notificationErrors.length > 0) {
      this.logger.error(
        `Event ${id} cancelled — ${notificationErrors.length} notification errors: ${notificationErrors.join(', ')}`,
      );
    }

    return {
      ...updated,
      refundedParticipants: refundedCount,
      cleanedUpIntents,
      notifiedParticipants: participants.length,
      notificationErrors: notificationErrors.length,
    };
  }

  async duplicate(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, updatedAt: _ua, status: _st, ...rest } = event;
    return this.prisma.event.create({
      data: {
        ...rest,
        status: 'ACTIVE',
        costPerPerson: rest.costPerPerson,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');

    if (!isAdmin) {
      if (event.organizerId !== userId) {
        throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
      }
      const participantCount = await this.prisma.eventParticipation.count({
        where: { eventId: id },
      });
      if (participantCount > 0) {
        throw new BadRequestException(
          'Nie można usunąć — są zgłoszeni uczestnicy. Możesz oznaczyć wydarzenie jako odwołane.',
        );
      }
    }

    return this.prisma.event.delete({ where: { id } });
  }

  async getParticipants(eventId: string) {
    return this.prisma.eventParticipation.findMany({
      where: { eventId, status: { notIn: ['WITHDRAWN', 'REJECTED'] } },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Organizer Participant Management ────────────────────────────────────────

  async getParticipantsForOrganizer(eventId: string, organizerUserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const participations = await this.prisma.eventParticipation.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            amount: true,
            voucherAmountUsed: true,
            organizerAmount: true,
            method: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return participations.map((p) => ({
      id: p.id,
      userId: p.userId,
      status: p.status,
      isGuest: p.isGuest,
      createdAt: p.createdAt,
      user: p.user,
      payment: p.payments[0] ?? null,
    }));
  }

  async markPaid(eventId: string, participationId: string, organizerUserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const participation = await this.prisma.eventParticipation.findFirst({
      where: { id: participationId, eventId },
    });
    if (!participation) {
      throw new NotFoundException('Uczestnictwo nie znalezione');
    }
    if (!['APPROVED', 'CONFIRMED'].includes(participation.status)) {
      throw new BadRequestException(
        'Oznaczenie jako opłacone możliwe tylko dla zatwierdzonych/potwierdzonych uczestników',
      );
    }

    const amount = event.costPerPerson.toNumber();

    await this.prisma.payment.create({
      data: {
        participationId,
        userId: participation.userId,
        eventId,
        amount: new Decimal(amount),
        voucherAmountUsed: new Decimal(0),
        organizerAmount: new Decimal(amount),
        platformFee: new Decimal(0),
        status: 'COMPLETED',
        method: 'cash',
        paidAt: new Date(),
      },
    });

    return this.getParticipantsForOrganizer(eventId, organizerUserId);
  }

  async cancelPayment(
    eventId: string,
    paymentId: string,
    organizerUserId: string,
    dto: CancelPaymentDto,
  ) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, eventId },
      include: { participation: true },
    });
    if (!payment) {
      throw new NotFoundException('Płatność nie znaleziona');
    }
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Można anulować tylko opłaconą płatność');
    }

    const isCash = payment.method === 'cash';
    const refundAsVoucher = dto.refundAsVoucher ?? !isCash;
    const notifyUser = dto.notifyUser ?? !isCash;
    const refundAmount = payment.amount.toNumber();

    await this.prisma.$transaction(async (tx) => {
      if (isCash && !refundAsVoucher) {
        await tx.payment.delete({ where: { id: paymentId } });
      } else if (refundAsVoucher) {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'VOUCHER_REFUNDED', refundedAt: new Date() },
        });
        await tx.organizerVoucher.create({
          data: {
            recipientUserId: payment.userId,
            organizerUserId,
            eventId,
            sourcePaymentId: paymentId,
            amount: new Decimal(refundAmount),
            remainingAmount: new Decimal(refundAmount),
            source: 'MANUAL_REFUND',
            status: 'ACTIVE',
          },
        });
      } else {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'CANCELLED', refundedAt: new Date() },
        });
      }

      await tx.eventParticipation.update({
        where: { id: payment.participationId },
        data: { status: 'APPROVED' },
      });
    });

    if (notifyUser) {
      await this.notificationsService.create(
        payment.userId,
        'PAYMENT_CANCELLED',
        'Płatność anulowana',
        `Twoja płatność za wydarzenie "${event.title}" została anulowana.${refundAsVoucher ? ' Kwota została zwrócona na voucher organizatora.' : ''}`,
        eventId,
      );
    }

    return this.getParticipantsForOrganizer(eventId, organizerUserId);
  }

  async createSeries(organizerId: string, dto: CreateEventDto) {
    if (!dto.isRecurring || !dto.recurringRule) {
      return this.create(organizerId, dto);
    }

    const dates = this.generateRecurringDates(
      new Date(dto.startsAt),
      new Date(dto.endsAt),
      dto.recurringRule,
    );

    // Create parent event
    const parentStartsAt = new Date(dto.startsAt);
    const parentLotteryExecutedAt = shouldSkipPreEnrollment(parentStartsAt) ? new Date() : null;
    const parent = await this.prisma.event.create({
      data: {
        ...dto,
        startsAt: parentStartsAt,
        endsAt: new Date(dto.endsAt),
        organizerId,
        isRecurring: true,
        recurringRule: dto.recurringRule,
        lotteryExecutedAt: parentLotteryExecutedAt,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });

    // Create child instances
    for (const { start, end } of dates.slice(1)) {
      const childLotteryExecutedAt = shouldSkipPreEnrollment(start) ? new Date() : null;
      await this.prisma.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          disciplineId: dto.disciplineId,
          facilityId: dto.facilityId,
          levelId: dto.levelId,
          cityId: dto.cityId,
          startsAt: start,
          endsAt: end,
          costPerPerson: dto.costPerPerson,
          minParticipants: dto.minParticipants,
          maxParticipants: dto.maxParticipants,
          ageMin: dto.ageMin,
          ageMax: dto.ageMax,
          gender: dto.gender,
          visibility: dto.visibility,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          coverImageId: dto.coverImageId,
          organizerId,
          isRecurring: true,
          recurringRule: dto.recurringRule,
          parentEventId: parent.id,
          lotteryExecutedAt: childLotteryExecutedAt,
        },
      });
    }

    return parent;
  }

  async updateSeries(id: string, userId: string, dto: UpdateEventDto) {
    const parent = await this.update(id, userId, dto);

    // Update all child events in the series
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.disciplineId !== undefined) data.disciplineId = dto.disciplineId;
    if (dto.facilityId !== undefined) data.facilityId = dto.facilityId;
    if (dto.levelId !== undefined) data.levelId = dto.levelId;
    if (dto.cityId !== undefined) data.cityId = dto.cityId;
    if (dto.costPerPerson !== undefined) data.costPerPerson = dto.costPerPerson;
    if (dto.maxParticipants !== undefined) data.maxParticipants = dto.maxParticipants;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.lat !== undefined) data.lat = dto.lat;
    if (dto.lng !== undefined) data.lng = dto.lng;

    if (Object.keys(data).length > 0) {
      await this.prisma.event.updateMany({
        where: { parentEventId: id, status: 'ACTIVE' },
        data,
      });
    }

    return parent;
  }

  private async resolveCoverImageId(
    coverImageId: string | undefined,
    disciplineId: string,
  ): Promise<string | undefined> {
    if (coverImageId) {
      return coverImageId;
    }
    const random = await this.coverImagesService.findRandomByDiscipline(disciplineId);
    return random?.id;
  }

  private generateRecurringDates(
    startsAt: Date,
    endsAt: Date,
    rule: string,
  ): { start: Date; end: Date }[] {
    const duration = endsAt.getTime() - startsAt.getTime();
    const dates: { start: Date; end: Date }[] = [];
    const maxInstances = 52; // max 1 year of weekly events

    let intervalDays = 7; // default weekly
    if (rule === 'DAILY') intervalDays = 1;
    else if (rule === 'BIWEEKLY') intervalDays = 14;
    else if (rule === 'MONTHLY') intervalDays = 30;

    for (let i = 0; i < maxInstances; i++) {
      const start = new Date(startsAt.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + duration);
      dates.push({ start, end });
    }

    return dates;
  }
}
