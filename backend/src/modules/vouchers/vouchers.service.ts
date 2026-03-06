import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string, organizerId: string): Promise<number> {
    const result = await this.prisma.organizerVoucher.aggregate({
      where: {
        recipientUserId: userId,
        organizerUserId: organizerId,
        status: 'ACTIVE',
      },
      _sum: { remainingAmount: true },
    });
    return result._sum.remainingAmount?.toNumber() ?? 0;
  }

  async getUserVouchers(userId: string) {
    const vouchers = await this.prisma.organizerVoucher.findMany({
      where: { recipientUserId: userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      include: {
        organizer: { select: { id: true, displayName: true, avatarUrl: true } },
        event: { select: { id: true, title: true } },
      },
    });

    // Group by organizer
    const grouped = new Map<
      string,
      {
        organizer: { id: string; displayName: string; avatarUrl: string | null };
        totalBalance: number;
        vouchers: typeof vouchers;
      }
    >();

    for (const v of vouchers) {
      const key = v.organizerUserId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          organizer: v.organizer,
          totalBalance: 0,
          vouchers: [],
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const group = grouped.get(key)!;
      group.totalBalance += v.remainingAmount.toNumber();
      group.vouchers.push(v);
    }

    return Array.from(grouped.values());
  }

  async deductVoucher(
    userId: string,
    organizerId: string,
    amount: number,
  ): Promise<void> {
    const vouchers = await this.prisma.organizerVoucher.findMany({
      where: {
        recipientUserId: userId,
        organizerUserId: organizerId,
        status: 'ACTIVE',
        remainingAmount: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    let remaining = amount;

    for (const voucher of vouchers) {
      if (remaining <= 0) {
        break;
      }

      const available = voucher.remainingAmount.toNumber();
      const toDeduct = Math.min(available, remaining);
      const newRemaining = Math.round((available - toDeduct) * 100) / 100;

      await this.prisma.organizerVoucher.update({
        where: { id: voucher.id },
        data: {
          remainingAmount: new Decimal(newRemaining),
          status: newRemaining <= 0 ? 'FULLY_USED' : 'ACTIVE',
        },
      });

      remaining = Math.round((remaining - toDeduct) * 100) / 100;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        'Niewystarczające saldo voucherów do realizacji płatności',
      );
    }
  }

  async restoreVoucher(
    userId: string,
    organizerId: string,
    amount: number,
  ): Promise<void> {
    // Create a new voucher to restore the deducted amount
    await this.prisma.organizerVoucher.create({
      data: {
        recipientUserId: userId,
        organizerUserId: organizerId,
        amount: new Decimal(amount),
        remainingAmount: new Decimal(amount),
        source: 'MANUAL_REFUND',
        status: 'ACTIVE',
      },
    });
  }

  async createVoucher(
    recipientUserId: string,
    organizerUserId: string,
    eventId: string | null,
    amount: number,
    source: string,
  ) {
    return this.prisma.organizerVoucher.create({
      data: {
        recipientUserId,
        organizerUserId,
        eventId,
        amount: new Decimal(amount),
        remainingAmount: new Decimal(amount),
        source,
        status: 'ACTIVE',
      },
    });
  }

  async bulkCreateForCancelledEvent(eventId: string): Promise<number> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });
    if (!event) {
      return 0;
    }

    // Find only ACTIVE participants (ACCEPTED/PARTICIPANT) who have COMPLETED payments
    const paidParticipations = await this.prisma.eventParticipation.findMany({
      where: {
        eventId,
        status: { in: ['APPLIED', 'ACCEPTED', 'PARTICIPANT'] },
        payments: { some: { status: 'COMPLETED' } },
      },
      include: {
        payments: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (paidParticipations.length === 0) {
      return 0;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const participation of paidParticipations) {
        const payment = participation.payments[0];

        if (!payment) {
          continue;
        }

        const refundAmount = payment.amount.toNumber();

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
            eventId,
            amount: new Decimal(refundAmount),
            remainingAmount: new Decimal(refundAmount),
            source: 'EVENT_CANCELLATION',
            status: 'ACTIVE',
          },
        });
      }
    });

    return paidParticipations.length;
  }
}
