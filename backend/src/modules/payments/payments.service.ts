import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TpayService, TpayWebhookPayload } from './tpay.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private tpayService: TpayService,
    private vouchersService: VouchersService,
  ) {}

  async cleanupIntents(participationId: string, organizerId: string) {
    const intents = await this.prisma.paymentIntent.findMany({
      where: { participationId },
    });

    for (const intent of intents) {
      const voucherReserved = intent.voucherReserved.toNumber();
      if (voucherReserved > 0) {
        await this.vouchersService.restoreVoucher(
          intent.userId,
          organizerId,
          voucherReserved,
        );
      }
      await this.prisma.paymentIntent.delete({ where: { id: intent.id } });
    }
  }

  async initiatePayment(
    participationId: string,
    eventId: string,
    userId: string,
    amount: number,
    payerEmail: string,
    payerName: string,
    frontendBaseUrl: string,
    backendBaseUrl: string,
  ): Promise<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, organizerId: true },
    });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }

    // Clean up any previous intents (e.g. from a failed attempt)
    await this.cleanupIntents(participationId, event.organizerId);

    const voucherBalance = await this.vouchersService.getBalance(userId, event.organizerId);

    // Case 1: Voucher fully covers the cost — create Payment directly
    if (voucherBalance >= amount) {
      const payment = await this.prisma.payment.create({
        data: {
          participationId,
          userId,
          eventId,
          amount: new Decimal(amount),
          voucherAmountUsed: new Decimal(amount),
          organizerAmount: new Decimal(amount),
          platformFee: new Decimal(0),
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      await this.vouchersService.deductVoucher(userId, event.organizerId, amount);

      const newStatus = event.organizerId
        ? await this.resolveParticipationStatus(eventId)
        : 'APPLIED';

      await this.prisma.eventParticipation.update({
        where: { id: participationId },
        data: { status: newStatus },
      });

      return { paymentId: payment.id, paidByVoucher: true };
    }

    // Case 2: Tpay payment needed — create PaymentIntent (temporary)
    const voucherUsed = voucherBalance > 0 ? voucherBalance : 0;
    const tpayAmount = Math.round((amount - voucherUsed) * 100) / 100;

    const intent = await this.prisma.paymentIntent.create({
      data: {
        participationId,
        userId,
        eventId,
        amount: new Decimal(amount),
        voucherReserved: new Decimal(voucherUsed),
      },
    });

    // Reserve voucher amount (deduct now, restore on failure via webhook)
    if (voucherUsed > 0) {
      await this.vouchersService.deductVoucher(userId, event.organizerId, voucherUsed);
    }

    const successUrl = `${frontendBaseUrl}/payment/status?intentId=${encodeURIComponent(intent.id)}&result=success`;
    const errorUrl = `${frontendBaseUrl}/payment/status?intentId=${encodeURIComponent(intent.id)}&result=error`;
    
    const result = await this.tpayService.createTransaction({
      amount: tpayAmount,
      description: `Zgadajsie – ${event.title}`,
      hiddenDescription: intent.id,
      payerEmail,
      payerName,
      successUrl,
      errorUrl,
      callbackUrl: `${backendBaseUrl}/api/payments/tpay-webhook`,
    });

    await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { operatorTxId: result.transactionId },
    });

    return { paymentUrl: result.paymentUrl };
  }

  async handleWebhook(
    body: TpayWebhookPayload,
    jwsSignature?: string,
  ): Promise<void> {
    const verification = await this.tpayService.verifyWebhook(
      body,
      jwsSignature,
    );
    if (!verification.valid) {
      throw new BadRequestException('Nieprawidłowy podpis webhooka');
    }

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { operatorTxId: verification.transactionId },
      include: {
        participation: { include: { event: true } },
      },
    });

    if (!intent) {
      // Idempotency: check if Payment already exists for this transaction
      const existingPayment = await this.prisma.payment.findFirst({
        where: { operatorTxId: verification.transactionId },
      });
      if (existingPayment) {
        return; // Already processed — idempotent
      }
      return; // Unknown transaction — ignore
    }

    // Tpay sends tr_status = 'TRUE' for successful payment
    if (verification.status === 'TRUE') {
      const event = intent.participation.event;
      const newParticipationStatus = event.autoAccept ? 'ACCEPTED' : 'APPLIED';

      await this.prisma.$transaction(async (tx) => {
        // Create finalized Payment from intent data
        await tx.payment.create({
          data: {
            participationId: intent.participationId,
            userId: intent.userId,
            eventId: intent.eventId,
            amount: intent.amount,
            voucherAmountUsed: intent.voucherReserved,
            organizerAmount: intent.amount,
            platformFee: new Decimal(0),
            status: 'COMPLETED',
            operatorTxId: intent.operatorTxId,
            paidAt: new Date(),
          },
        });

        await tx.eventParticipation.update({
          where: { id: intent.participationId },
          data: { status: newParticipationStatus },
        });
      });

      return;
    }

    // Tpay sends tr_status = 'FALSE' for failed payment
    if (verification.status === 'FALSE') {
      // Restore reserved voucher on payment failure
      const voucherReserved = intent.voucherReserved.toNumber();
      if (voucherReserved > 0) {
        await this.vouchersService.restoreVoucher(
          intent.userId,
          intent.participation.event.organizerId,
          voucherReserved,
        );
      }

      return;
    }

    // Other statuses (CHARGEBACK etc.) — log and ignore for now
  }

  async refundAsVoucher(
    paymentId: string,
    organizerUserId: string,
  ): Promise<{ success: boolean }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        event: { select: { id: true, organizerId: true, title: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Płatność nie znaleziona');
    }
    if (payment.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Można zwrócić tylko opłaconą płatność');
    }

    const refundAmount = payment.amount.toNumber();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'VOUCHER_REFUNDED', refundedAt: new Date() },
      });

      await tx.eventParticipation.update({
        where: { id: payment.participationId },
        data: { status: 'WITHDRAWN' },
      });

      await tx.organizerVoucher.create({
        data: {
          recipientUserId: payment.userId,
          organizerUserId,
          eventId: payment.eventId,
          amount: new Decimal(refundAmount),
          remainingAmount: new Decimal(refundAmount),
          source: 'MANUAL_REFUND',
          status: 'ACTIVE',
        },
      });
    });

    return { success: true };
  }

  async refundAsMoney(
    paymentId: string,
    organizerUserId: string,
  ): Promise<{ success: boolean }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        event: { select: { id: true, organizerId: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Płatność nie znaleziona');
    }
    if (payment.event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Można zwrócić tylko opłaconą płatność');
    }

    const tpayPaidAmount =
      payment.amount.toNumber() - payment.voucherAmountUsed.toNumber();

    if (tpayPaidAmount <= 0 || !payment.operatorTxId) {
      throw new BadRequestException(
        'Ta płatność nie zawiera kwoty opłaconej przez Tpay — użyj zwrotu voucherem',
      );
    }

    const result = await this.tpayService.createRefund(
      payment.operatorTxId,
      tpayPaidAmount,
    );

    if (result.success) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });

        await tx.eventParticipation.update({
          where: { id: payment.participationId },
          data: { status: 'WITHDRAWN' },
        });

        // If voucher was partially used, restore it as a new voucher
        const voucherUsed = payment.voucherAmountUsed.toNumber();
        if (voucherUsed > 0) {
          await tx.organizerVoucher.create({
            data: {
              recipientUserId: payment.userId,
              organizerUserId: payment.event.organizerId,
              eventId: payment.eventId,
              amount: new Decimal(voucherUsed),
              remainingAmount: new Decimal(voucherUsed),
              source: 'MANUAL_REFUND',
              status: 'ACTIVE',
            },
          });
        }
      });
    }

    return result;
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        voucherAmountUsed: true,
        paidAt: true,
        createdAt: true,
        event: { select: { id: true, title: true, city: { select: { slug: true } } } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Płatność nie znaleziona');
    }
    return payment;
  }

  async getIntentPaymentStatus(intentId: string, userId?: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      select: {
        participationId: true,
        userId: true,
        amount: true,
        voucherReserved: true,
        createdAt: true,
        participation: {
          select: { event: { select: { id: true, title: true, city: { select: { slug: true } } } } },
        },
      },
    });

    if (!intent) {
      throw new NotFoundException('Płatność nie znaleziona');
    }

    if (userId && intent.userId !== userId) {
      throw new ForbiddenException('Brak dostępu do tej płatności');
    }

    // Check if a finalized Payment already exists for this participation
    const payment = await this.prisma.payment.findFirst({
      where: { participationId: intent.participationId },
      select: {
        id: true,
        status: true,
        amount: true,
        voucherAmountUsed: true,
        paidAt: true,
        createdAt: true,
        event: { select: { id: true, title: true, city: { select: { slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (payment) {
      return payment;
    }

    // No finalized payment yet — still pending
    return {
      id: intentId,
      status: 'PENDING',
      amount: intent.amount,
      voucherAmountUsed: intent.voucherReserved,
      paidAt: null,
      createdAt: intent.createdAt,
      event: intent.participation.event,
    };
  }

  async getMyPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          voucherAmountUsed: true,
          status: true,
          paidAt: true,
          createdAt: true,
          event: { select: { id: true, title: true, city: { select: { slug: true } } } },
        },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }

  async getEventEarnings(eventId: string, organizerUserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (event.organizerId !== organizerUserId) {
      throw new ForbiddenException('Nie jesteś organizatorem tego wydarzenia');
    }

    const payments = await this.prisma.payment.findMany({
      where: { eventId, status: 'COMPLETED' },
      select: {
        id: true,
        amount: true,
        voucherAmountUsed: true,
        organizerAmount: true,
        platformFee: true,
        paidAt: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const totalAmount = payments.reduce(
      (sum, p) => sum + p.organizerAmount.toNumber(),
      0,
    );

    return { payments, totalAmount, eventId };
  }

  async getAdminPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          event: { select: { id: true, title: true, city: { select: { slug: true } } } },
        },
      }),
      this.prisma.payment.count(),
    ]);
    return { data, total, page, limit };
  }

  async getAdminPaymentDetail(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        event: { select: { id: true, title: true, organizerId: true, city: { select: { slug: true } } } },
        participation: { select: { id: true, status: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Płatność nie znaleziona');
    }
    return payment;
  }

  private async resolveParticipationStatus(eventId: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { autoAccept: true },
    });
    if (!event) throw new NotFoundException('Wydarzenie nie znalezione');
    return event.autoAccept ? 'ACCEPTED' : 'APPLIED';
  }

  // DEV ONLY: Simulate successful webhook for local testing
  async simulateSuccessfulPayment(intentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: { participation: { include: { event: true } } },
    });

    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }

    // Check if already processed (idempotent)
    const existing = await this.prisma.payment.findFirst({
      where: { participationId: intent.participationId },
    });
    if (existing) {
      return existing;
    }

    const newStatus = await this.resolveParticipationStatus(intent.eventId);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          participationId: intent.participationId,
          userId: intent.userId,
          eventId: intent.eventId,
          amount: intent.amount,
          voucherAmountUsed: intent.voucherReserved,
          organizerAmount: intent.amount.sub(intent.voucherReserved),
          platformFee: new Decimal(0),
          status: 'COMPLETED',
          operatorTxId: intent.operatorTxId ?? `sim-${Date.now()}`,
          method: 'tpay',
          paidAt: new Date(),
        },
      });

      await tx.eventParticipation.update({
        where: { id: intent.participationId },
        data: { status: newStatus },
      });

      return payment;
    });
  }
}
