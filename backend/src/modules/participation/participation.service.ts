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
    if (event.organizerId === userId)
      throw new BadRequestException('Organizator nie może dołączyć do własnego wydarzenia');

    const isPaid = event.costPerPerson.toNumber() > 0;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, avatarUrl: true, email: true },
    });
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');

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

    // User is in PENDING_PAYMENT — restart payment flow
    if (existing && existing.status === 'PENDING_PAYMENT' && isPaid) {
      const paymentResult = await this.tryInitiatePayment(existing.id, event, user);
      const updated = await this.prisma.eventParticipation.findUnique({
        where: { id: existing.id },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
      return { ...updated, ...paymentResult };
    }

    // User previously withdrew — rejoin
    if (existing && existing.status === 'WITHDRAWN') {
      if (isPaid) {
        // Reuse existing completed payment — no need to pay again
        if (activeCompletedPayment) {
          const restoredStatus = event.autoAccept ? 'ACCEPTED' : 'APPLIED';
          return this.prisma.eventParticipation.update({
            where: { id: existing.id },
            data: { status: restoredStatus },
            include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
          });
        }

        // No completed payment — start payment flow
        const updated = await this.prisma.eventParticipation.update({
          where: { id: existing.id },
          data: { status: 'PENDING_PAYMENT' },
          include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
        });
        const paymentResult = await this.tryInitiatePayment(updated.id, event, user);
        return { ...updated, ...paymentResult };
      }
      const newStatus = event.autoAccept ? 'ACCEPTED' : 'APPLIED';
      return this.prisma.eventParticipation.update({
        where: { id: existing.id },
        data: { status: newStatus },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
    }
    if (existing) throw new BadRequestException('Już uczestniczysz w tym wydarzeniu');

    if (event.maxParticipants) {
      const count = await this.prisma.eventParticipation.count({
        where: { eventId, status: { in: ['APPLIED', 'ACCEPTED', 'PARTICIPANT', 'PENDING_PAYMENT'] } },
      });
      if (count >= event.maxParticipants) throw new BadRequestException('Wydarzenie jest pełne');
    }

    if (isPaid) {
      const participation = await this.prisma.eventParticipation.create({
        data: { eventId, userId, status: 'PENDING_PAYMENT' },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
      });
      const paymentResult = await this.tryInitiatePayment(participation.id, event, user);
      return { ...participation, ...paymentResult };
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

    return participation;
  }

  private async tryInitiatePayment(
    participationId: string,
    event: { id: string; costPerPerson: { toNumber(): number }; organizerId: string; title: string },
    user: { id: string; email: string; displayName: string },
  ): Promise<{ paymentUrl?: string; paymentId?: string }> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const backendUrl = this.configService.getOrThrow<string>('BACKEND_URL');
    const result = await this.paymentsService.initiatePayment(
      participationId,
      event.id,
      user.id,
      event.costPerPerson.toNumber(),
      user.email,
      user.displayName,
      frontendUrl,
      backendUrl,
    );
    return { paymentUrl: result.paymentUrl, paymentId: result.paymentId };
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
}
