import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  MILLISECONDS_PER_HOUR,
  EventGender,
  EventVisibility,
  NotificationKind,
} from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CoverImagesService } from '../cover-images/cover-images.service';
import { CitySubscriptionsService } from '../city-subscriptions/city-subscriptions.service';
import { SlotService } from '../slots/slot.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { EnrollmentEligibilityService } from '../participation/enrollment-eligibility.service';
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
    private slotService: SlotService,
    private eventRealtime: EventRealtimeService,
    private eligibility: EnrollmentEligibilityService,
  ) {}

  async create(organizerId: string, dto: CreateEventDto) {
    const coverImageId = await this.resolveCoverImageId(dto.coverImageId, dto.disciplineSlug);

    const startsAt = new Date(dto.startsAt);
    const lotteryExecutedAt = shouldSkipPreEnrollment(startsAt) ? new Date() : null;

    // Validate roleConfig if provided
    if (dto.roleConfig) {
      this.validateRoleConfig(dto.roleConfig, dto.maxParticipants);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roleConfig: _roleConfig, ...restDto } = dto;

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        startsAt,
        endsAt: new Date(dto.endsAt),
        organizer: { connect: { id: organizerId } },
        coverImage: coverImageId ? { connect: { id: coverImageId } } : undefined,
        lotteryExecutedAt,
        roleConfig: dto.roleConfig ? JSON.parse(JSON.stringify(dto.roleConfig)) : undefined,
        discipline: { connect: { slug: dto.disciplineSlug } },
        facility: { connect: { slug: dto.facilitySlug } },
        level: { connect: { slug: dto.levelSlug } },
        city: { connect: { slug: dto.citySlug } },
        costPerPerson: dto.costPerPerson,
        minParticipants: dto.minParticipants,
        maxParticipants: dto.maxParticipants,
        ageMin: dto.ageMin,
        ageMax: dto.ageMax,
        gender: dto.gender as EventGender,
        visibility: dto.visibility as EventVisibility,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        rules: dto.rules,
      },
      include: { discipline: true, facility: true, level: true, city: true, coverImage: true },
    });

    // Create slots for the event (with role assignment if roleConfig provided)
    await this.slotService.createSlotsForEvent(event.id, dto.maxParticipants, dto.roleConfig);

    this.notifyCitySubscribers(event.id, event.title, event.citySlug, organizerId);

    return event;
  }

  /**
   * Validate roleConfig: sum of role slots must equal maxParticipants.
   */
  private validateRoleConfig(
    roleConfig: { roles: { slots: number; isDefault: boolean }[] },
    maxParticipants: number,
  ): void {
    const totalSlots = roleConfig.roles.reduce((sum, r) => sum + r.slots, 0);
    if (totalSlots !== maxParticipants) {
      throw new BadRequestException(
        `Suma slotów ról (${totalSlots}) musi być równa liczbie uczestników (${maxParticipants})`,
      );
    }

    const defaultRoles = roleConfig.roles.filter((r) => r.isDefault);
    if (defaultRoles.length !== 1) {
      throw new BadRequestException('Dokładnie jedna rola musi być oznaczona jako domyślna');
    }
  }

  private notifyCitySubscribers(
    eventId: string,
    eventTitle: string,
    citySlug: string,
    organizerId: string,
  ): void {
    setImmediate(async () => {
      try {
        const subscriberIds = await this.citySubscriptionsService.getSubscriberIds(citySlug);
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
    // If citySlug is provided, ensure the city exists — otherwise return 404
    if (citySlug) {
      const city = await this.prisma.city.findUnique({ where: { slug: citySlug } });
      if (!city) {
        throw new NotFoundException('Miejscowość nie znaleziona');
      }
    }
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
          organizer: {
            select: { id: true, displayName: true, avatarUrl: true, donationUrl: true },
          },
          _count: {
            select: {
              participations: {
                where: {
                  wantsIn: true,
                  OR: [
                    { slot: { confirmed: true } },
                    { slot: { confirmed: false, participationId: { not: null } } },
                  ],
                },
              },
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
        organizer: { select: { id: true, displayName: true, avatarUrl: true, donationUrl: true } },
      },
    });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');

    const eventTimeStatus = getEventTimeStatus(event);
    const enrollmentPhase = getEnrollmentPhase(event);

    const isOrganizer = !!userId && event.organizerId === userId;
    const currentUserAccess =
      userId && !isOrganizer
        ? { isNewUser: await this.eligibility.isNewUser(userId, event.organizerId) }
        : null;

    return {
      ...event,
      eventTimeStatus,
      enrollmentPhase,
      currentUserAccess,
    };
  }

  async getEventForDuplication(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        discipline: true,
        facility: true,
        level: true,
        city: true,
        coverImage: true,
        organizer: { select: { id: true, displayName: true, avatarUrl: true, donationUrl: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie zostało znalezione');
    }

    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie możesz duplikować tego wydarzenia');
    }

    return event;
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    if (event.status !== 'ACTIVE' || new Date() >= event.startsAt) {
      throw new BadRequestException(
        'Wydarzenie nie może być edytowane - skontaktuj się z administracją serwisu.',
      );
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);

    // Validate and sync slots if maxParticipants or roleConfig is changing
    const newRoleConfig =
      (dto.roleConfig as { roles: Array<{ key: string; slots: number }> } | undefined) ??
      (event.roleConfig as { roles: Array<{ key: string; slots: number }> } | null);
    const isRoleBased = newRoleConfig?.roles && newRoleConfig.roles.length > 0;

    if (dto.maxParticipants !== undefined || dto.roleConfig !== undefined) {
      const newMaxParticipants = dto.maxParticipants ?? event.maxParticipants;

      // Validate the change (total occupied vs new max)
      if (dto.maxParticipants !== undefined) {
        const validationError = await this.slotService.validateMaxParticipantsChange(
          id,
          newMaxParticipants,
        );
        if (validationError) {
          throw new BadRequestException(validationError);
        }
      }

      // Update event first
      const updatedEvent = await this.prisma.event.update({
        where: { id },
        data,
        include: { discipline: true, facility: true, level: true, city: true },
      });

      // Then sync slots — use per-role reconciliation for role-based events
      if (isRoleBased) {
        await this.slotService.reconcileSlotsForRoleConfig(id, newRoleConfig!);
      } else if (dto.maxParticipants !== undefined) {
        await this.slotService.adjustSlotsForMaxParticipants(
          id,
          event.maxParticipants,
          newMaxParticipants,
        );
      }

      this.eventRealtime.invalidateEvent(id, 'all');

      return updatedEvent;
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data,
      include: { discipline: true, facility: true, level: true, city: true },
    });

    this.eventRealtime.invalidateEvent(id, 'all');

    return updatedEvent;
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

        // Refund paid participants via vouchers (those with wantsIn=true and completed payment)
        const paidParticipations = await tx.eventParticipation.findMany({
          where: {
            eventId: id,
            wantsIn: true,
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
            data: { wantsIn: false, withdrawnBy: 'ORGANIZER' },
          });
          // Release slot
          await tx.eventSlot.updateMany({
            where: { participationId: participation.id },
            data: { participationId: null, confirmed: false, assignedAt: null },
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
        const waitingParticipations = await tx.eventParticipation.findMany({
          where: { eventId: id, wantsIn: true },
        });

        let cleanedIntents = 0;
        for (const participation of waitingParticipations) {
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
            data: { wantsIn: false, withdrawnBy: 'ORGANIZER' },
          });
          // Release slot
          await tx.eventSlot.updateMany({
            where: { participationId: participation.id },
            data: { participationId: null, confirmed: false, assignedAt: null },
          });
        }

        return { updated: updatedEvent, refundedCount: refunded, cleanedUpIntents: cleanedIntents };
      },
    );

    // Notifications (fire-and-forget, outside transaction)
    const notificationErrors: string[] = [];
    const participants = await this.prisma.eventParticipation.findMany({
      where: { eventId: id },
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
        `Event ${id} cancelled - ${
          notificationErrors.length
        } notification errors: ${notificationErrors.join(', ')}`,
      );
    }

    this.eventRealtime.invalidateEvent(id, 'all');

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
    const newEvent = await this.prisma.event.create({
      data: {
        ...rest,
        status: 'ACTIVE',
        costPerPerson: rest.costPerPerson,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });

    this.eventRealtime.invalidateEvent(newEvent.id, 'all');

    return newEvent;
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
          'Nie można usunąć - są zgłoszeni uczestnicy. Możesz oznaczyć wydarzenie jako odwołane.',
        );
      }
    }

    await this.prisma.event.delete({ where: { id } });

    this.eventRealtime.invalidateEvent(id, 'all');

    return;
  }

  async getParticipants(eventId: string) {
    const participations = await this.prisma.eventParticipation.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
            isActive: true,
            isEmailVerified: true,
          },
        },
        addedBy: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        slot: true,
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

    return participations.map((p) => {
      // Derive status from slot-based model
      let status: string;
      if (!p.wantsIn) {
        status = p.withdrawnBy === 'ORGANIZER' ? 'REJECTED' : 'WITHDRAWN';
      } else if (p.slot) {
        status = p.slot.confirmed ? 'CONFIRMED' : 'APPROVED';
      } else {
        status = 'PENDING';
      }
      return {
        ...p,
        status,
        waitingReason: status === 'PENDING' ? p.waitingReason : null,
        addedByUserId: p.addedByUserId,
        addedByUser: p.addedBy ?? null,
        isGuest: p.addedByUserId !== null,
        payment: p.payments[0] ?? null,
      };
    });
  }

  async getSlots(eventId: string) {
    return this.prisma.eventSlot.findMany({
      where: { eventId },
      select: {
        id: true,
        locked: true,
        roleKey: true,
        participationId: true,
        confirmed: true,
        assignedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
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
      include: { slot: true },
    });
    if (!participation) {
      throw new NotFoundException('Uczestnictwo nie znalezione');
    }
    // Must have a slot to mark as paid
    if (!participation.slot) {
      throw new BadRequestException(
        'Oznaczenie jako opłacone możliwe tylko dla uczestników z przydzielonym miejscem',
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

    this.eventRealtime.invalidateEvent(eventId, 'participants');

    return this.getParticipants(eventId);
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
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });
      }

      // Slot stays assigned, but confirmed=false (user must re-confirm after re-paying)
      await tx.eventSlot.updateMany({
        where: { participationId: payment.participationId },
        data: { confirmed: false },
      });
    });

    if (notifyUser) {
      await this.notificationsService.create(
        payment.userId,
        'PAYMENT_CANCELLED' as NotificationKind,
        'Płatność anulowana',
        `Twoja płatność za wydarzenie "${event.title}" została anulowana.${
          refundAsVoucher ? ' Kwota została zwrócona na voucher organizatora.' : ''
        }`,
        eventId,
      );
    }

    this.eventRealtime.invalidateEvent(eventId, 'participants');

    return this.getParticipants(eventId);
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

    // Validate roleConfig if provided
    if (dto.roleConfig) {
      this.validateRoleConfig(dto.roleConfig, dto.maxParticipants);
    }

    const roleConfigJson = dto.roleConfig ? JSON.parse(JSON.stringify(dto.roleConfig)) : undefined;

    // Create parent event
    const parentStartsAt = new Date(dto.startsAt);
    const parentLotteryExecutedAt = shouldSkipPreEnrollment(parentStartsAt) ? new Date() : null;
    const parent = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        discipline: { connect: { slug: dto.disciplineSlug } },
        facility: { connect: { slug: dto.facilitySlug } },
        level: { connect: { slug: dto.levelSlug } },
        city: { connect: { slug: dto.citySlug } },
        startsAt: parentStartsAt,
        endsAt: new Date(dto.endsAt),
        costPerPerson: dto.costPerPerson,
        minParticipants: dto.minParticipants,
        maxParticipants: dto.maxParticipants,
        ageMin: dto.ageMin,
        ageMax: dto.ageMax,
        gender: dto.gender as EventGender,
        visibility: dto.visibility as EventVisibility,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        coverImage: dto.coverImageId ? { connect: { id: dto.coverImageId } } : undefined,
        rules: dto.rules,
        organizer: { connect: { id: organizerId } },
        isRecurring: true,
        recurringRule: dto.recurringRule,
        lotteryExecutedAt: parentLotteryExecutedAt,
        roleConfig: roleConfigJson,
      },
      include: { discipline: true, facility: true, level: true, city: true },
    });

    // Create slots for parent event
    await this.slotService.createSlotsForEvent(parent.id, dto.maxParticipants, dto.roleConfig);

    // Create child instances
    for (const { start, end } of dates.slice(1)) {
      const childLotteryExecutedAt = shouldSkipPreEnrollment(start) ? new Date() : null;
      const child = await this.prisma.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          discipline: { connect: { slug: dto.disciplineSlug } },
          facility: { connect: { slug: dto.facilitySlug } },
          level: { connect: { slug: dto.levelSlug } },
          city: { connect: { slug: dto.citySlug } },
          startsAt: start,
          endsAt: end,
          costPerPerson: dto.costPerPerson,
          minParticipants: dto.minParticipants,
          maxParticipants: dto.maxParticipants,
          ageMin: dto.ageMin,
          ageMax: dto.ageMax,
          gender: dto.gender as EventGender,
          visibility: dto.visibility as EventVisibility,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          coverImage: dto.coverImageId ? { connect: { id: dto.coverImageId } } : undefined,
          organizer: { connect: { id: organizerId } },
          isRecurring: true,
          recurringRule: dto.recurringRule,
          parentEvent: { connect: { id: parent.id } },
          lotteryExecutedAt: childLotteryExecutedAt,
          roleConfig: roleConfigJson,
        },
        include: { discipline: true, facility: true, level: true, city: true },
      });
      // Create slots for child event
      await this.slotService.createSlotsForEvent(child.id, dto.maxParticipants, dto.roleConfig);
    }

    return parent;
  }

  async updateSeries(id: string, userId: string, dto: UpdateEventDto) {
    const parent = await this.update(id, userId, dto);

    // Update all child events in the series
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.disciplineSlug !== undefined) {
      data.discipline = { connect: { slug: dto.disciplineSlug } };
    }
    if (dto.facilitySlug !== undefined) {
      data.facility = { connect: { slug: dto.facilitySlug } };
    }
    if (dto.levelSlug !== undefined) {
      data.level = { connect: { slug: dto.levelSlug } };
    }
    if (dto.citySlug !== undefined) {
      data.city = { connect: { slug: dto.citySlug } };
    }
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
    disciplineSlug: string,
  ): Promise<string | undefined> {
    if (coverImageId) {
      return coverImageId;
    }
    const random = await this.coverImagesService.findRandomByDiscipline(disciplineSlug);
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
      const start = new Date(startsAt.getTime() + i * intervalDays * 24 * MILLISECONDS_PER_HOUR);
      const end = new Date(start.getTime() + duration);
      dates.push({ start, end });
    }

    return dates;
  }
}
