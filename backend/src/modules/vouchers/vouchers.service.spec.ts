import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { VoucherSource, VoucherStatus } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { VouchersService } from './vouchers.service';

function buildPrismaMock() {
  return {
    organizerVoucher: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    eventEnrollment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
    eventSlot: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: any) => any) => fn(buildTxMock())),
  } as unknown as PrismaService;
}

function buildTxMock() {
  return {
    payment: { update: jest.fn() },
    eventEnrollment: { update: jest.fn() },
    eventSlot: { updateMany: jest.fn() },
    organizerVoucher: { create: jest.fn() },
  };
}

describe('VouchersService', () => {
  let service: VouchersService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new VouchersService(prisma as PrismaService);
    jest.clearAllMocks();
  });

  describe('getBalance()', () => {
    it('zwraca aktualne saldo voucherów użytkownika', async () => {
      (prisma.organizerVoucher.aggregate as jest.Mock).mockResolvedValue({
        _sum: { remainingAmount: new Decimal('75.50') },
      });

      const balance = await service.getBalance('user1', 'org1');

      expect(balance).toBe(75.5);
    });

    it('saldo = suma wszystkich aktywnych voucherów', async () => {
      (prisma.organizerVoucher.aggregate as jest.Mock).mockResolvedValue({
        _sum: { remainingAmount: new Decimal('100') },
      });

      const balance = await service.getBalance('user1', 'org1');

      expect(prisma.organizerVoucher.aggregate as jest.Mock).toHaveBeenCalledWith({
        where: {
          recipientUserId: 'user1',
          organizerUserId: 'org1',
          status: VoucherStatus.ACTIVE,
        },
        _sum: { remainingAmount: true },
      });
      expect(balance).toBe(100);
    });

    it('wygasłe vouchery nie wliczają się do salda (status != ACTIVE)', async () => {
      (prisma.organizerVoucher.aggregate as jest.Mock).mockResolvedValue({
        _sum: { remainingAmount: null },
      });

      const balance = await service.getBalance('user1', 'org1');

      expect(balance).toBe(0);
    });
  });

  describe('deductVoucher()', () => {
    it('odejmuje kwotę od salda przy płatności', async () => {
      const voucher = {
        id: 'v1',
        remainingAmount: new Decimal('100'),
      };
      (prisma.organizerVoucher.findMany as jest.Mock).mockResolvedValue([voucher]);
      (prisma.organizerVoucher.update as jest.Mock).mockResolvedValue({});

      await service.deductVoucher('user1', 'org1', 50);

      expect(prisma.organizerVoucher.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: {
          remainingAmount: new Decimal(50),
          status: VoucherStatus.ACTIVE,
        },
      });
    });

    it('odrzuca jeśli saldo niewystarczające', async () => {
      (prisma.organizerVoucher.findMany as jest.Mock).mockResolvedValue([
        { id: 'v1', remainingAmount: new Decimal('20') },
      ]);
      (prisma.organizerVoucher.update as jest.Mock).mockResolvedValue({});

      await expect(service.deductVoucher('user1', 'org1', 50)).rejects.toThrow(BadRequestException);
    });

    it('częściowe pokrycie: voucher 30zł dla płatności 50zł → remaining=0 FULLY_USED', async () => {
      const voucher = { id: 'v1', remainingAmount: new Decimal('30') };
      (prisma.organizerVoucher.findMany as jest.Mock).mockResolvedValue([voucher]);
      (prisma.organizerVoucher.update as jest.Mock).mockResolvedValue({});

      // 30zł voucher for 50zł payment — will throw because 20zł remaining after voucher
      await expect(service.deductVoucher('user1', 'org1', 50)).rejects.toThrow(BadRequestException);

      // Update should still have been called with the 30zł deducted
      expect(prisma.organizerVoucher.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: {
          remainingAmount: new Decimal(0),
          status: VoucherStatus.FULLY_USED,
        },
      });
    });
  });

  describe('restoreVoucher()', () => {
    it('przywraca kwotę do salda przy refundzie', async () => {
      (prisma.organizerVoucher.create as jest.Mock).mockResolvedValue({});

      await service.restoreVoucher('user1', 'org1', 50);

      expect(prisma.organizerVoucher.create as jest.Mock).toHaveBeenCalledWith({
        data: {
          recipientUserId: 'user1',
          organizerUserId: 'org1',
          amount: new Decimal(50),
          remainingAmount: new Decimal(50),
          source: VoucherSource.MANUAL_REFUND,
          status: VoucherStatus.ACTIVE,
        },
      });
    });
  });

  describe('precision Decimal', () => {
    it('operacje na Decimal zachowują precyzję (bez błędów float)', async () => {
      const voucher = { id: 'v1', remainingAmount: new Decimal('0.30') };
      (prisma.organizerVoucher.findMany as jest.Mock).mockResolvedValue([voucher]);
      (prisma.organizerVoucher.update as jest.Mock).mockResolvedValue({});

      await service.deductVoucher('user1', 'org1', 0.30);

      const updateCall = (prisma.organizerVoucher.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.remainingAmount.toNumber()).toBe(0);
    });

    it('wystawia nowy voucher przy anulowaniu eventu', async () => {
      (prisma.organizerVoucher.create as jest.Mock).mockResolvedValue({});

      await service.createVoucher('user1', 'org1', 'event1', 99.99, VoucherSource.EVENT_CANCELLATION);

      expect(prisma.organizerVoucher.create as jest.Mock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: new Decimal(99.99),
          remainingAmount: new Decimal(99.99),
          source: VoucherSource.EVENT_CANCELLATION,
        }),
      });
    });
  });
});
