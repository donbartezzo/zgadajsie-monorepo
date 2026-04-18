import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { TpayService } from './tpay.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { PaymentsService } from './payments.service';

function buildTxMock() {
  return {
    payment: { create: jest.fn(), findFirst: jest.fn() },
    paymentIntent: { delete: jest.fn() },
    eventSlot: { updateMany: jest.fn() },
  };
}

function buildPrismaMock() {
  const tx = buildTxMock();
  return {
    event: { findUnique: jest.fn() },
    payment: { create: jest.fn(), findFirst: jest.fn() },
    paymentIntent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventSlot: { updateMany: jest.fn() },
    eventEnrollment: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: any) => any) => fn(tx)),
    _tx: tx,
  } as unknown as PrismaService & { _tx: ReturnType<typeof buildTxMock> };
}

function buildTpayMock() {
  return {
    verifyWebhook: jest.fn(),
    createTransaction: jest.fn(),
  } as unknown as TpayService;
}

function buildVouchersMock() {
  return {
    getBalance: jest.fn().mockResolvedValue(0),
    deductVoucher: jest.fn().mockResolvedValue(undefined),
    restoreVoucher: jest.fn().mockResolvedValue(undefined),
  } as unknown as VouchersService;
}

function buildRealtimeMock() {
  return {
    invalidateEvent: jest.fn(),
  } as unknown as EventRealtimeService;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let tpay: ReturnType<typeof buildTpayMock>;
  let vouchers: ReturnType<typeof buildVouchersMock>;
  let realtime: ReturnType<typeof buildRealtimeMock>;
  let tx: ReturnType<typeof buildTxMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    tx = (prisma as any)._tx;
    tpay = buildTpayMock();
    vouchers = buildVouchersMock();
    realtime = buildRealtimeMock();
    service = new PaymentsService(
      prisma as PrismaService,
      tpay as TpayService,
      vouchers as VouchersService,
      realtime as EventRealtimeService,
    );
    jest.clearAllMocks();
  });

  describe('cleanupIntents()', () => {
    it('usuwa wszystkie PaymentIntent dla participationId', async () => {
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([
        { id: 'i1', voucherReserved: new Decimal(0) },
        { id: 'i2', voucherReserved: new Decimal(0) },
      ]);
      (prisma.paymentIntent.delete as jest.Mock).mockResolvedValue({});

      await service.cleanupIntents('p1', 'org1');

      expect(prisma.paymentIntent.delete as jest.Mock).toHaveBeenCalledTimes(2);
    });

    it('przywraca zarezerwowane vouchery (restoreVoucher) dla każdego intentu', async () => {
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([
        { id: 'i1', userId: 'user1', voucherReserved: new Decimal(30) },
      ]);
      (prisma.paymentIntent.delete as jest.Mock).mockResolvedValue({});

      await service.cleanupIntents('p1', 'org1');

      expect(vouchers.restoreVoucher as jest.Mock).toHaveBeenCalledWith('user1', 'org1', 30);
    });

    it('nie wywołuje restoreVoucher jeśli voucherReserved=0', async () => {
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([
        { id: 'i1', voucherReserved: new Decimal(0) },
      ]);
      (prisma.paymentIntent.delete as jest.Mock).mockResolvedValue({});

      await service.cleanupIntents('p1', 'org1');

      expect(vouchers.restoreVoucher as jest.Mock).not.toHaveBeenCalled();
    });

    it('działa poprawnie gdy brak intentów', async () => {
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      await service.cleanupIntents('p1', 'org1');

      expect(prisma.paymentIntent.delete as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('initiatePayment()', () => {
    const baseParams = {
      participationId: 'p1',
      eventId: 'event1',
      userId: 'user1',
      amount: 50,
      payerEmail: 'user@example.com',
      payerName: 'User',
      frontendBaseUrl: 'https://app.example.com',
      backendBaseUrl: 'https://api.example.com',
    };

    beforeEach(() => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        title: 'Test Event',
        organizerId: 'org1',
      });
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('100% pokrycie voucherem → Payment COMPLETED + potwierdza slot + paidByVoucher=true', async () => {
      (vouchers.getBalance as jest.Mock).mockResolvedValue(50);
      (prisma.payment.create as jest.Mock).mockResolvedValue({ id: 'pay1' });
      (prisma.eventSlot.updateMany as jest.Mock).mockResolvedValue({});

      const result = await service.initiatePayment(
        baseParams.participationId,
        baseParams.eventId,
        baseParams.userId,
        baseParams.amount,
        baseParams.payerEmail,
        baseParams.payerName,
        baseParams.frontendBaseUrl,
        baseParams.backendBaseUrl,
      );

      expect(result.paidByVoucher).toBe(true);
      expect(result.paymentId).toBe('pay1');
      expect(prisma.eventSlot.updateMany as jest.Mock).toHaveBeenCalledWith({
        where: { enrollmentId: 'p1' },
        data: { confirmed: true },
      });
    });

    it('tworzy PaymentIntent gdy voucher nie pokrywa całości', async () => {
      (vouchers.getBalance as jest.Mock).mockResolvedValue(0);
      (prisma.paymentIntent.create as jest.Mock).mockResolvedValue({
        id: 'intent1',
        userId: 'user1',
      });
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (tpay.createTransaction as jest.Mock).mockResolvedValue({
        transactionId: 'TX1',
        paymentUrl: 'https://pay.tpay.com/TX1',
      });

      const result = await service.initiatePayment(
        baseParams.participationId,
        baseParams.eventId,
        baseParams.userId,
        baseParams.amount,
        baseParams.payerEmail,
        baseParams.payerName,
        baseParams.frontendBaseUrl,
        baseParams.backendBaseUrl,
      );

      expect(result.paymentUrl).toBe('https://pay.tpay.com/TX1');
      expect(prisma.paymentIntent.create as jest.Mock).toHaveBeenCalled();
    });

    it('czyści stare intenty przed utworzeniem nowego (cleanupIntents)', async () => {
      (vouchers.getBalance as jest.Mock).mockResolvedValue(0);
      (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([
        { id: 'old1', voucherReserved: new Decimal(0) },
      ]);
      (prisma.paymentIntent.delete as jest.Mock).mockResolvedValue({});
      (prisma.paymentIntent.create as jest.Mock).mockResolvedValue({ id: 'intent1' });
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (tpay.createTransaction as jest.Mock).mockResolvedValue({
        transactionId: 'TX1',
        paymentUrl: 'https://pay.tpay.com/TX1',
      });

      await service.initiatePayment(
        baseParams.participationId,
        baseParams.eventId,
        baseParams.userId,
        baseParams.amount,
        baseParams.payerEmail,
        baseParams.payerName,
        baseParams.frontendBaseUrl,
        baseParams.backendBaseUrl,
      );

      expect(prisma.paymentIntent.delete as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'old1' },
      });
    });

    it('callbackUrl wskazuje na backend /api/payments/tpay-webhook', async () => {
      (vouchers.getBalance as jest.Mock).mockResolvedValue(0);
      (prisma.paymentIntent.create as jest.Mock).mockResolvedValue({ id: 'intent1' });
      (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({});
      (tpay.createTransaction as jest.Mock).mockResolvedValue({
        transactionId: 'TX1',
        paymentUrl: 'https://pay.tpay.com/TX1',
      });

      await service.initiatePayment(
        baseParams.participationId,
        baseParams.eventId,
        baseParams.userId,
        baseParams.amount,
        baseParams.payerEmail,
        baseParams.payerName,
        baseParams.frontendBaseUrl,
        baseParams.backendBaseUrl,
      );

      const tpayCall = (tpay.createTransaction as jest.Mock).mock.calls[0][0];
      expect(tpayCall.callbackUrl).toBe(
        `${baseParams.backendBaseUrl}/api/payments/tpay-webhook`,
      );
    });
  });

  describe('handleWebhook()', () => {
    it('odrzuca nieprawidłowy podpis (BadRequestException)', async () => {
      (tpay.verifyWebhook as jest.Mock).mockResolvedValue({ valid: false });

      await expect(
        service.handleWebhook({ tr_id: 'TX1' } as any, 'bad-sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('status TRUE → tworzy Payment COMPLETED + potwierdza slot', async () => {
      const mockIntent = {
        id: 'intent1',
        enrollmentId: 'p1',
        userId: 'user1',
        eventId: 'event1',
        amount: new Decimal(50),
        voucherReserved: new Decimal(0),
        operatorTxId: 'TX1',
        enrollment: { event: { organizerId: 'org1' } },
      };
      (tpay.verifyWebhook as jest.Mock).mockResolvedValue({
        valid: true,
        transactionId: 'TX1',
        status: 'TRUE',
      });
      (prisma.paymentIntent.findFirst as jest.Mock).mockResolvedValue(mockIntent);
      tx.payment.create.mockResolvedValue({ id: 'pay1' });
      tx.eventSlot.updateMany.mockResolvedValue({});

      await service.handleWebhook({ tr_id: 'TX1' } as any, 'valid-sig');

      expect(tx.payment.create).toHaveBeenCalled();
      expect(tx.eventSlot.updateMany).toHaveBeenCalledWith({
        where: { enrollmentId: 'p1' },
        data: { confirmed: true },
      });
      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'participants');
    });

    it('status FALSE → przywraca saldo vouchera', async () => {
      const mockIntent = {
        id: 'intent1',
        enrollmentId: 'p1',
        userId: 'user1',
        eventId: 'event1',
        amount: new Decimal(50),
        voucherReserved: new Decimal(30),
        operatorTxId: 'TX1',
        enrollment: { event: { organizerId: 'org1' } },
      };
      (tpay.verifyWebhook as jest.Mock).mockResolvedValue({
        valid: true,
        transactionId: 'TX1',
        status: 'FALSE',
      });
      (prisma.paymentIntent.findFirst as jest.Mock).mockResolvedValue(mockIntent);

      await service.handleWebhook({ tr_id: 'TX1' } as any, 'valid-sig');

      expect(vouchers.restoreVoucher as jest.Mock).toHaveBeenCalledWith('user1', 'org1', 30);
    });

    it('idempotentność — Payment już istnieje → noop', async () => {
      (tpay.verifyWebhook as jest.Mock).mockResolvedValue({
        valid: true,
        transactionId: 'TX1',
        status: 'TRUE',
      });
      (prisma.paymentIntent.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ id: 'pay1' });

      await service.handleWebhook({ tr_id: 'TX1' } as any, 'valid-sig');

      expect(tx.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('simulateSuccessfulPayment()', () => {
    it('rzuca NotFoundException dla nieistniejącego intentId', async () => {
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.simulateSuccessfulPayment('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
