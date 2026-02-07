import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Portfel nie znaleziony');
    return { balance: wallet.balance };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Portfel nie znaleziony');

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { relatedEvent: { select: { id: true, title: true } } },
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return { data: transactions, total, page, limit };
  }

  async credit(userId: string, amount: number, type: string, description?: string, relatedEventId?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Portfel nie znaleziony');

    return this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: new Decimal(amount),
          description,
          relatedEventId,
        },
      }),
    ]);
  }

  async debit(userId: string, amount: number, type: string, description?: string, relatedEventId?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Portfel nie znaleziony');
    if (wallet.balance.toNumber() < amount) {
      throw new NotFoundException('Niewystarczające środki');
    }

    return this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: new Decimal(-amount),
          description,
          relatedEventId,
        },
      }),
    ]);
  }

  async adminAdjust(targetUserId: string, adminUserId: string, amount: number, description?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) throw new NotFoundException('Portfel nie znaleziony');

    const type = amount >= 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT';

    return this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: new Decimal(amount),
          description,
          adminUserId,
        },
      }),
    ]);
  }
}
