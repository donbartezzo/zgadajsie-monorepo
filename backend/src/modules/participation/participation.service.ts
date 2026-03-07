import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class ParticipationService {
  private readonly logger = new Logger(ParticipationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
    private pushService: PushService,
    private paymentsService: PaymentsService,
  ) {}

  async join(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    if (event.status !== 'ACTIVE') throw new BadRequestException('Wydarzenie nie jest aktywne');

    const isPaid = event.costPerPerson.toNumber() > 0;

    const existing = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const activeCompletedPayment = existing?.payments.find(
      (payment) => payment.status === 'COMPLETED',
    );

    // User is already in PENDING_PAYMENT — return current state
    if (existing && existing.status === 'PENDING_PAYMENT' && isPaid) {
      const current = await this.prisma.eventParticipation.findUnique({
        where: { id: existing.id },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
      return { ...current, isPaid, costPerPerson: event.costPerPerson.toNumber() };
    }

    // User previously withdrew — rejoin
    if (existing && existing.status === 'WITHDRAWN') {
      if (isPaid) {
        // Reuse existing completed payment — no need to pay again
        if (activeCompletedPayment) {
          const restoredStatus = event.autoAccept ? 'ACCEPTED' : 'APPLIED';
          const updated = await this.prisma.eventParticipation.update({
            where: { id: existing.id },
            data: { status: restoredStatus },
            include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
          });
          return { ...updated, isPaid, costPerPerson: event.costPerPerson.toNumber() };
        }

        // No completed payment — set PENDING_PAYMENT (user pays separately)
        const updated = await this.prisma.eventParticipation.update({
          where: { id: existing.id },
          data: { status: 'PENDING_PAYMENT' },
          include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
        });
        return { ...updated, isPaid, costPerPerson: event.costPerPerson.toNumber() };
      }
      const newStatus = event.autoAccept ? 'ACCEPTED' : 'APPLIED';
      const updated = await this.prisma.eventParticipation.update({
        where: { id: existing.id },
        data: { status: newStatus },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
      return { ...updated, isPaid, costPerPerson: 0 };
    }
    if (existing) throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');

    if (event.maxParticipants) {
      const count = await this.prisma.eventParticipation.count({
        where: { eventId, status: { in: ['APPLIED', 'ACCEPTED', 'PARTICIPANT', 'PENDING_PAYMENT'] } },
      });
      if (count >= event.maxParticipants) throw new BadRequestException('Wydarzenie jest pełne');
    }

    if (isPaid) {
      // Organizator automatycznie dostaje status ACCEPTED (nie musi płacić)
      if (event.organizerId === userId) {
        const participation = await this.prisma.eventParticipation.create({
          data: { eventId, userId, status: 'ACCEPTED' },
          include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
        });
        return { ...participation, isPaid, costPerPerson: event.costPerPerson.toNumber() };
      }

      const participation = await this.prisma.eventParticipation.create({
        data: { eventId, userId, status: 'PENDING_PAYMENT' },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
      return { ...participation, isPaid, costPerPerson: event.costPerPerson.toNumber() };
    }

    const status = event.autoAccept ? 'ACCEPTED' : 'APPLIED';

    const participation = await this.prisma.eventParticipation.create({
      data: { eventId, userId, status },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
    });

    // Notify organizer about new application
    const organizer = await this.prisma.user.findUnique({
      where: { id: event.organizerId },
      select: { id: true, email: true, displayName: true },
    });
    if (organizer) {
      await this.pushService.notifyNewApplication(
        organizer.id,
        participation.user.displayName,
        event.title,
        eventId,
      );
      await this.emailService.sendNewApplicationEmail(
        organizer.email,
        organizer.displayName,
        participation.user.displayName,
        event.title,
      );
    }

    return { ...participation, isPaid, costPerPerson: 0 };
  }

  async joinGuest(eventId: string, addedByUserId: string, displayName: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');

    const guestCount = await this.prisma.eventParticipation.count({
      where: { eventId, addedByUserId, isGuest: true },
    });
    if (guestCount >= 2) throw new BadRequestException('Możesz dodać maksymalnie 2 gości');

    const guestUser = await this.prisma.user.create({
      data: {
        email: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@guest.zgadajsie.pl`,
        displayName,
        isActive: false,
      },
    });

    return this.prisma.eventParticipation.create({
      data: {
        eventId,
        userId: guestUser.id,
        addedByUserId,
        isGuest: true,
        status: 'APPLIED',
      },
    });
  }

  async accept(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Zgłoszenie nie znalezione');
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'ACCEPTED' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        event: { select: { id: true, title: true } },
      },
    });

    await this.pushService.notifyParticipationStatus(
      updated.userId,
      updated.event.title,
      'ACCEPTED',
      updated.eventId,
    );
    await this.emailService.sendParticipationStatusEmail(
      updated.user.email,
      updated.user.displayName,
      updated.event.title,
      'ACCEPTED',
    );

    return updated;
  }

  async reject(participationId: string, organizerUserId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Zgłoszenie nie znalezione');
    if (participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem');
    }

    const updated = await this.prisma.eventParticipation.update({
      where: { id: participationId },
      data: { status: 'WITHDRAWN' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        event: { select: { id: true, title: true } },
      },
    });

    await this.pushService.notifyParticipationStatus(
      updated.userId,
      updated.event.title,
      'REJECTED',
      updated.eventId,
    );
    await this.emailService.sendParticipationStatusEmail(
      updated.user.email,
      updated.user.displayName,
      updated.event.title,
      'REJECTED',
    );

    return updated;
  }

  async leave(eventId: string, userId: string) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Nie uczestniczysz w tym wydarzeniu');

    // Clean up any pending payment intents (restore reserved vouchers)
    await this.paymentsService.cleanupIntents(
      participation.id,
      participation.event.organizerId,
    );

    return this.prisma.eventParticipation.update({
      where: { id: participation.id },
      data: { status: 'WITHDRAWN' },
    });
  }

  async initiateEventPayment(
    eventId: string,
    userId: string,
  ): Promise<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: true },
    });
    if (!participation) throw new NotFoundException('Nie uczestniczysz w tym wydarzeniu');
    if (participation.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Płatność nie jest wymagana dla tego zgłoszenia');
    }

    const event = participation.event;
    if (event.costPerPerson.toNumber() <= 0) {
      throw new BadRequestException('To wydarzenie jest bezpłatne');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const backendUrl = this.configService.getOrThrow<string>('BACKEND_URL');

    return this.paymentsService.initiatePayment(
      participation.id,
      event.id,
      user.id,
      event.costPerPerson.toNumber(),
      user.email,
      user.displayName,
      frontendUrl,
      backendUrl,
    );
  }
}
