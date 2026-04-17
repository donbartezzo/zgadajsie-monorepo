import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TpayService, TpayWebhookPayload } from './tpay.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private tpayService: TpayService,
    private vouchersService: VouchersService,
    private eventRealtime: EventRealtimeService,
  ) {}

  async cleanupIntents(participationId: string, organizerId: string) {
    const intents = await this.prisma.paymentIntent.findMany({
      where: { enrollmentId: participationId },
    });

    for (const intent of intents) {
      const voucherReserved = intent.voucherReserved.toNumber();
      if (voucherReserved > 0) {
        await this.vouchersService.restoreVoucher(intent.userId, organizerId, voucherReserved);
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

    // Case 1: Voucher fully covers the cost - create Payment directly
    if (voucherBalance >= amount) {
      const payment = await this.prisma.payment.create({
        data: {
          enrollmentId: participationId,
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

      // Confirm the slot after successful payment
      await this.prisma.eventSlot.updateMany({
        where: { enrollmentId: participationId },
        data: { confirmed: true },
      });

      this.eventRealtime.invalidateEvent(eventId, 'participants');

      return { paymentId: payment.id, paidByVoucher: true };
    }

    // Case 2: Tpay payment needed - create PaymentIntent (temporary)
    const voucherUsed = voucherBalance > 0 ? voucherBalance : 0;
    const tpayAmount = Math.round((amount - voucherUsed) * 100) / 100;

    const intent = await this.prisma.paymentIntent.create({
      data: {
        enrollmentId: participationId,
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

    const successUrl = `${frontendBaseUrl}/payment/status?intentId=${encodeURIComponent(
      intent.id,
    )}&result=success`;
    const errorUrl = `${frontendBaseUrl}/payment/status?intentId=${encodeURIComponent(
      intent.id,
    )}&result=error`;

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

  async handleWebhook(body: TpayWebhookPayload, jwsSignature?: string): Promise<void> {
    const verification = await this.tpayService.verifyWebhook(body, jwsSignature);
    if (!verification.valid) {
      throw new BadRequestException('Nieprawidłowy podpis webhooka');
    }

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { operatorTxId: verification.transactionId },
      include: {
        enrollment: { include: { event: true } },
      },
    });

    if (!intent) {
      // Idempotency: check if Payment already exists for this transaction
      const existingPayment = await this.prisma.payment.findFirst({
        where: { operatorTxId: verification.transactionId },
      });
      if (existingPayment) {
        return; // Already processed - idempotent
      }
      return; // Unknown transaction - ignore
    }

    // Tpay sends tr_status = 'TRUE' for successful payment
    if (verification.status === 'TRUE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            enrollmentId: intent.enrollmentId,
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

        // Confirm the slot after successful payment
        await tx.eventSlot.updateMany({
          where: { enrollmentId: intent.enrollmentId },
          data: { confirmed: true },
        });
      });

      this.eventRealtime.invalidateEvent(intent.eventId, 'participants');

      return;
    }

    // Tpay sends tr_status = 'FALSE' for failed payment
    if (verification.status === 'FALSE') {
      // Restore reserved voucher on payment failure
      const voucherReserved = intent.voucherReserved.toNumber();
      if (voucherReserved > 0) {
        await this.vouchersService.restoreVoucher(
          intent.userId,
          intent.enrollment.event.organizerId,
          voucherReserved,
        );
      }

      this.eventRealtime.invalidateEvent(intent.eventId, 'participants');

      return;
    }

    // Other statuses (CHARGEBACK etc.) - log and ignore for now
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
        enrollmentId: true,
        userId: true,
        amount: true,
        voucherReserved: true,
        createdAt: true,
        enrollment: {
          select: {
            event: { select: { id: true, title: true, city: { select: { slug: true } } } },
          },
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
      where: { enrollmentId: intent.enrollmentId },
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

    // No finalized payment yet - still pending
    return {
      id: intentId,
      status: 'PENDING',
      amount: intent.amount,
      voucherAmountUsed: intent.voucherReserved,
      paidAt: null,
      createdAt: intent.createdAt,
      event: intent.enrollment.event,
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
        event: {
          select: { id: true, title: true, organizerId: true, city: { select: { slug: true } } },
        },
        enrollment: { select: { id: true, wantsIn: true }, include: { slot: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Płatność nie znaleziona');
    }
    return payment;
  }

  // DEV ONLY: Simulate successful webhook for local testing
  async simulateSuccessfulPayment(intentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: { enrollment: { include: { event: true } } },
    });

    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }

    // Check if already processed (idempotent)
    const existing = await this.prisma.payment.findFirst({
      where: { enrollmentId: intent.enrollmentId },
    });
    if (existing) {
      return existing;
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          enrollmentId: intent.enrollmentId,
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

      // Confirm the slot after successful payment
      await tx.eventSlot.updateMany({
        where: { enrollmentId: intent.enrollmentId },
        data: { confirmed: true },
      });

      return payment;
    });

    this.eventRealtime.invalidateEvent(intent.eventId, 'participants');

    return payment;
  }
}
