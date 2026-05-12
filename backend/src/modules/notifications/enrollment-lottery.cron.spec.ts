import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { PushService } from './push.service';
import { EnrollmentLotteryCron } from './enrollment-lottery.cron';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

function buildTxMock() {
  return {
    event: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    eventEnrollment: {
      findMany: jest.fn(),
    },
    eventSlot: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    organizerUserRelation: {
      findMany: jest.fn(),
    },
  };
}

function buildPrismaMock() {
  const tx = buildTxMock();
  return {
    event: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: ReturnType<typeof buildTxMock>) => unknown) => fn(tx)),
    _tx: tx,
  } as unknown as PrismaService & { _tx: ReturnType<typeof buildTxMock> };
}

function buildPushMock() {
  return {
    notifyParticipationStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as PushService;
}

function buildRealtimeMock() {
  return {
    invalidateEvent: jest.fn(),
  } as unknown as EventRealtimeService;
}

describe('EnrollmentLotteryCron', () => {
  let cron: EnrollmentLotteryCron;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let push: ReturnType<typeof buildPushMock>;
  let realtime: ReturnType<typeof buildRealtimeMock>;
  let tx: ReturnType<typeof buildTxMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    tx = prisma._tx;
    push = buildPushMock();
    realtime = buildRealtimeMock();
    const mockCronAdmin = {
      registerTrigger: jest.fn(),
      recordRun: jest.fn(),
      recordRunToDb: jest.fn().mockResolvedValue(undefined),
    } as unknown as CronAdminService;
    cron = new EnrollmentLotteryCron(
      prisma as PrismaService,
      push as PushService,
      realtime as EventRealtimeService,
      mockCronAdmin,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  describe('handleLottery()', () => {
    it('znajduje eventy ACTIVE z lotteryExecutedAt=null i startsAt <= threshold 48h', async () => {
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      await cron.handleLottery();

      const call = (prisma.event.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.status).toBe('ACTIVE');
      expect(call.where.lotteryExecutedAt).toBeNull();
      expect(call.where.startsAt).toHaveProperty('lte');
    });

    it('pomija eventy z lotteryExecutedAt != null (już przetworzone)', async () => {
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      await cron.handleLottery();

      const call = (prisma.event.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.lotteryExecutedAt).toBeNull();
    });

    it('loguje błąd ale kontynuuje dla kolejnych eventów', async () => {
      const events = [
        { id: 'event1', maxParticipants: 5, organizerId: 'org1', title: 'Event 1' },
        { id: 'event2', maxParticipants: 5, organizerId: 'org1', title: 'Event 2' },
      ];
      (prisma.event.findMany as jest.Mock).mockResolvedValue(events);
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce(null);

      await cron.handleLottery();

      expect(Logger.prototype.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('event1'),
      );
    });
  });

  describe('executeLotteryForEvent()', () => {
    const event = { id: 'event1', maxParticipants: 2, organizerId: 'org1', title: 'Test Event' };

    it('atomowy lock: ustawia lotteryExecutedAt - drugi call zwraca noop', async () => {
      tx.event.updateMany.mockResolvedValue({ count: 0 });

      await cron.executeLotteryForEvent(event);

      expect(realtime.invalidateEvent as jest.Mock).not.toHaveBeenCalled();
    });

    it('0 pending participations → noop (no error)', async () => {
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue([]);

      await cron.executeLotteryForEvent(event);

      expect(tx.organizerUserRelation.findMany).not.toHaveBeenCalled();
      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'all');
    });

    it('filtruje tylko real userów (addedByUserId=null) - goście nie uczestniczą', async () => {
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue([]);

      await cron.executeLotteryForEvent(event);

      const call = tx.eventEnrollment.findMany.mock.calls[0][0];
      expect(call.where.addedByUserId).toBeNull();
      expect(call.where.wantsIn).toBe(true);
    });

    it('filtruje eligible: isTrusted=true AND isBanned!=true', async () => {
      const pendingUsers = [
        { id: 'p1', userId: 'u1', eventId: 'event1', slot: null },
        { id: 'p2', userId: 'u2', eventId: 'event1', slot: null },
        { id: 'p3', userId: 'u3', eventId: 'event1', slot: null },
      ];
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue(pendingUsers);
      tx.organizerUserRelation.findMany.mockResolvedValue([
        { targetUserId: 'u1', isTrusted: true, isBanned: false }, // eligible
        { targetUserId: 'u2', isTrusted: false, isBanned: false }, // NOT eligible (new user)
        { targetUserId: 'u3', isTrusted: true, isBanned: true }, // NOT eligible (banned)
      ]);
      tx.eventSlot.findFirst.mockResolvedValue({ id: 'slot1', enrollmentId: null, locked: false });
      tx.eventSlot.update.mockResolvedValue({});

      await cron.executeLotteryForEvent(event);

      // Only p1 is eligible
      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledTimes(1);
      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledWith(
        'u1',
        'Test Event',
        'SLOT_ASSIGNED',
        'event1',
      );
    });

    it('przypisuje sloty do eligible aż do wyczerpania wolnych slotów', async () => {
      const pendingUsers = [
        { id: 'p1', userId: 'u1', eventId: 'event1', slot: null },
        { id: 'p2', userId: 'u2', eventId: 'event1', slot: null },
        { id: 'p3', userId: 'u3', eventId: 'event1', slot: null },
      ];
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue(pendingUsers);
      tx.organizerUserRelation.findMany.mockResolvedValue([
        { targetUserId: 'u1', isTrusted: true, isBanned: false },
        { targetUserId: 'u2', isTrusted: true, isBanned: false },
        { targetUserId: 'u3', isTrusted: true, isBanned: false },
      ]);
      // Only 1 free slot available
      tx.eventSlot.findFirst.mockResolvedValueOnce({ id: 'slot1' }).mockResolvedValueOnce(null);
      tx.eventSlot.update.mockResolvedValue({});

      await cron.executeLotteryForEvent(event);

      expect(tx.eventSlot.update).toHaveBeenCalledTimes(1);
    });

    it('wysyła LOTTERY_NOT_SELECTED do eligible ale niewylosowanych', async () => {
      const pendingUsers = [
        { id: 'p1', userId: 'u1', eventId: 'event1', slot: null },
        { id: 'p2', userId: 'u2', eventId: 'event1', slot: null },
      ];
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue(pendingUsers);
      tx.organizerUserRelation.findMany.mockResolvedValue([
        { targetUserId: 'u1', isTrusted: true, isBanned: false },
        { targetUserId: 'u2', isTrusted: true, isBanned: false },
      ]);
      // Only 1 slot - one gets it, one doesn't
      tx.eventSlot.findFirst.mockResolvedValueOnce({ id: 'slot1' }).mockResolvedValueOnce(null);
      tx.eventSlot.update.mockResolvedValue({});

      await cron.executeLotteryForEvent(event);

      const calls = (push.notifyParticipationStatus as jest.Mock).mock.calls;
      expect(calls).toHaveLength(2);
      const statuses = calls.map((c: unknown[]) => c[2]);
      expect(statuses).toContain('SLOT_ASSIGNED');
      expect(statuses).toContain('LOTTERY_NOT_SELECTED');
    });

    it('invaliduje event realtime po zakończeniu loterii', async () => {
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue([]);

      await cron.executeLotteryForEvent(event);

      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'all');
    });

    it('0 eligible (wszyscy nowi/zbanowani) → noop, brak przypisań', async () => {
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue([
        { id: 'p1', userId: 'u1', eventId: 'event1', slot: null },
      ]);
      tx.organizerUserRelation.findMany.mockResolvedValue([
        { targetUserId: 'u1', isTrusted: false, isBanned: false },
      ]);

      await cron.executeLotteryForEvent(event);

      expect(tx.eventSlot.update).not.toHaveBeenCalled();
      expect(push.notifyParticipationStatus as jest.Mock).not.toHaveBeenCalled();
    });

    it('wysyła SLOT_ASSIGNED dla użytkowników, którym organizator nadał slot przed losowaniem', async () => {
      // Pre-assigned by organizer during pre-enrollment (slot already attached).
      // Pending notifications were suppressed in pre-enrollment, so they must fire now.
      const participations = [
        { id: 'p1', userId: 'u1', eventId: 'event1', slot: { id: 'slot1' } },
        { id: 'p2', userId: 'u2', eventId: 'event1', slot: { id: 'slot2' } },
      ];
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue(participations);
      tx.organizerUserRelation.findMany.mockResolvedValue([]);
      tx.eventSlot.findFirst.mockResolvedValue(null);

      await cron.executeLotteryForEvent(event);

      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledTimes(2);
      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledWith(
        'u1',
        'Test Event',
        'SLOT_ASSIGNED',
        'event1',
      );
      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledWith(
        'u2',
        'Test Event',
        'SLOT_ASSIGNED',
        'event1',
      );
    });

    it('powiadamia mix: pre-assigned + eligible lottery winners + lottery losers', async () => {
      const participations = [
        // Pre-assigned by organizer:
        { id: 'p1', userId: 'u1', eventId: 'event1', slot: { id: 'slot1' } },
        // Pending eligible:
        { id: 'p2', userId: 'u2', eventId: 'event1', slot: null },
        { id: 'p3', userId: 'u3', eventId: 'event1', slot: null },
      ];
      tx.event.updateMany.mockResolvedValue({ count: 1 });
      tx.eventEnrollment.findMany.mockResolvedValue(participations);
      tx.organizerUserRelation.findMany.mockResolvedValue([
        { targetUserId: 'u2', isTrusted: true, isBanned: false },
        { targetUserId: 'u3', isTrusted: true, isBanned: false },
      ]);
      // Only one free slot for the lottery
      tx.eventSlot.findFirst.mockResolvedValueOnce({ id: 'slot2' }).mockResolvedValueOnce(null);
      tx.eventSlot.update.mockResolvedValue({});

      await cron.executeLotteryForEvent(event);

      const calls = (push.notifyParticipationStatus as jest.Mock).mock.calls;
      // 1 pre-assigned + 1 SLOT_ASSIGNED + 1 LOTTERY_NOT_SELECTED = 3
      expect(calls).toHaveLength(3);
      expect(calls.filter((c: unknown[]) => c[2] === 'SLOT_ASSIGNED')).toHaveLength(2);
      expect(calls.filter((c: unknown[]) => c[2] === 'LOTTERY_NOT_SELECTED')).toHaveLength(1);
    });
  });
});
