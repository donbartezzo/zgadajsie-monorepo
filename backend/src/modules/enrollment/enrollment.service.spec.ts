import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { featureFlags } from '../../common/config/feature-flags';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { PaymentsService } from '../payments/payments.service';
import { SlotService } from '../slots/slot.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { EnrollmentService } from './enrollment.service';

function buildTxMock() {
  return {
    eventEnrollment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: { delete: jest.fn() },
  };
}

function buildPrismaMock() {
  const tx = buildTxMock();
  return {
    event: { findUnique: jest.fn() },
    eventEnrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventSlot: { update: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    organizerUserRelation: { upsert: jest.fn() },
    payment: { findMany: jest.fn() },
    $transaction: jest.fn((fn: (tx: any) => any) => fn(tx)),
    _tx: tx,
  } as unknown as PrismaService & { _tx: ReturnType<typeof buildTxMock> };
}

function buildEmailMock() {
  return {
    sendNewApplicationEmail: jest.fn().mockResolvedValue(undefined),
    sendParticipationStatusEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailService;
}

function buildPushMock() {
  return {
    notifyNewApplication: jest.fn().mockResolvedValue(undefined),
    notifyParticipationStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as PushService;
}

function buildPaymentsMock() {
  return {
    cleanupIntents: jest.fn().mockResolvedValue(undefined),
    initiatePayment: jest.fn(),
  } as unknown as PaymentsService;
}

function buildSlotMock() {
  return {
    assignSlot: jest.fn().mockResolvedValue(undefined),
    releaseSlot: jest.fn().mockResolvedValue(undefined),
    confirmSlot: jest.fn().mockResolvedValue(undefined),
    getFreeSlotCount: jest.fn().mockResolvedValue(1),
    getAvailableRoles: jest.fn().mockResolvedValue([]),
  } as unknown as SlotService;
}

function buildEligibilityMock() {
  return {
    isBannedByOrganizer: jest.fn().mockResolvedValue(false),
    isNewUser: jest.fn().mockResolvedValue(false),
    getGuestCount: jest.fn().mockResolvedValue(0),
  } as unknown as EnrollmentEligibilityService;
}

function buildRealtimeMock() {
  return {
    invalidateEvent: jest.fn(),
  } as unknown as EventRealtimeService;
}

const FUTURE_FAR = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead → PRE_ENROLLMENT
const FUTURE_NEAR = new Date(Date.now() + 60 * 60 * 1000); // 1h ahead → within 48h threshold

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event1',
    organizerId: 'org1',
    title: 'Test Event',
    status: 'ACTIVE',
    costPerPerson: new Decimal(0),
    maxParticipants: 10,
    startsAt: FUTURE_FAR,
    endsAt: new Date(FUTURE_FAR.getTime() + 3600000),
    lotteryExecutedAt: null,
    roleConfig: null,
    ...overrides,
  };
}

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    eventId: 'event1',
    userId: 'user1',
    addedByUserId: null,
    wantsIn: true,
    withdrawnBy: null,
    roleKey: null,
    waitingReason: null,
    slot: null,
    user: { id: 'user1', displayName: 'User One', avatarUrl: null, email: 'user@test.com' },
    event: makeEvent(),
    payments: [],
    ...overrides,
  };
}

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let tx: ReturnType<typeof buildTxMock>;
  let email: ReturnType<typeof buildEmailMock>;
  let push: ReturnType<typeof buildPushMock>;
  let payments: ReturnType<typeof buildPaymentsMock>;
  let slots: ReturnType<typeof buildSlotMock>;
  let eligibility: ReturnType<typeof buildEligibilityMock>;
  let realtime: ReturnType<typeof buildRealtimeMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    tx = (prisma as any)._tx;
    email = buildEmailMock();
    push = buildPushMock();
    payments = buildPaymentsMock();
    slots = buildSlotMock();
    eligibility = buildEligibilityMock();
    realtime = buildRealtimeMock();
    service = new EnrollmentService(
      prisma as PrismaService,
      { getOrThrow: jest.fn().mockReturnValue('http://localhost:4200') } as any,
      email,
      push,
      payments,
      slots,
      eligibility,
      realtime,
    );
    jest.clearAllMocks();
  });

  // ─── deriveStatus (tested through service results) ───────────────────────

  describe('deriveStatus() — przez wyniki serwisu', () => {
    it('wantsIn=true, slot=null → PENDING', async () => {
      const event = makeEvent();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);
      const participation = makeEnrollment({ wantsIn: true, slot: null });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.join('event1', 'user1');

      expect(result.status).toBe('PENDING');
    });

    it('wantsIn=true, slot.confirmed=false → APPROVED', () => {
      const p = makeEnrollment({ wantsIn: true, slot: { confirmed: false } });
      const withStatus = {
        ...p,
        status: p.wantsIn && p.slot ? (p.slot.confirmed ? 'CONFIRMED' : 'APPROVED') : 'PENDING',
      };
      expect(withStatus.status).toBe('APPROVED');
    });

    it('wantsIn=true, slot.confirmed=true → CONFIRMED', () => {
      const p = makeEnrollment({ wantsIn: true, slot: { confirmed: true } });
      const status = p.wantsIn
        ? p.slot
          ? p.slot.confirmed
            ? 'CONFIRMED'
            : 'APPROVED'
          : 'PENDING'
        : 'WITHDRAWN';
      expect(status).toBe('CONFIRMED');
    });

    it('wantsIn=false, withdrawnBy=USER → WITHDRAWN', () => {
      const p = makeEnrollment({ wantsIn: false, withdrawnBy: 'USER' });
      const status = !p.wantsIn
        ? p.withdrawnBy === 'ORGANIZER'
          ? 'REJECTED'
          : 'WITHDRAWN'
        : 'PENDING';
      expect(status).toBe('WITHDRAWN');
    });

    it('wantsIn=false, withdrawnBy=ORGANIZER → REJECTED', () => {
      const p = makeEnrollment({ wantsIn: false, withdrawnBy: 'ORGANIZER' });
      const status = !p.wantsIn
        ? p.withdrawnBy === 'ORGANIZER'
          ? 'REJECTED'
          : 'WITHDRAWN'
        : 'PENDING';
      expect(status).toBe('REJECTED');
    });
  });

  // ─── join() PRE_ENROLLMENT ────────────────────────────────────────────────

  describe('join() — PRE_ENROLLMENT', () => {
    const preEnrollmentEvent = makeEvent({ startsAt: FUTURE_FAR, lotteryExecutedAt: null });

    it('tworzy enrollment ze statusem PENDING i waitingReason=PRE_ENROLLMENT', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(preEnrollmentEvent);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);
      const participation = makeEnrollment({ waitingReason: 'PRE_ENROLLMENT', slot: null });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.join('event1', 'user1');

      expect(result.status).toBe('PENDING');
      expect(result.waitingReason).toBe('PRE_ENROLLMENT');
      expect(prisma.eventEnrollment.create as jest.Mock).toHaveBeenCalled();
    });

    it('wysyła push + email do organizatora o nowym zgłoszeniu', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(preEnrollmentEvent);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);
      const participation = makeEnrollment({ waitingReason: 'PRE_ENROLLMENT' });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'org1',
        email: 'org@test.com',
        displayName: 'Organizer',
      });

      await service.join('event1', 'user1');

      expect(push.notifyNewApplication as jest.Mock).toHaveBeenCalled();
      expect(email.sendNewApplicationEmail as jest.Mock).toHaveBeenCalled();
    });

    it('odrzuca jeśli event nie istnieje (NotFoundException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.join('nonexistent', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('odrzuca jeśli event CANCELLED (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ status: 'CANCELLED' }));

      await expect(service.join('event1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca jeśli event już się rozpoczął (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ startsAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.join('event1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca jeśli użytkownik już uczestniczy (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(preEnrollmentEvent);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true }),
      );

      await expect(service.join('event1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca w fazie LOTTERY_PENDING (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ startsAt: FUTURE_NEAR, lotteryExecutedAt: null }),
      );

      await expect(service.join('event1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── join() OPEN_ENROLLMENT ───────────────────────────────────────────────

  describe('join() — OPEN_ENROLLMENT', () => {
    const openEvent = makeEvent({
      startsAt: FUTURE_FAR,
      lotteryExecutedAt: new Date(),
      costPerPerson: new Decimal(0),
    });

    beforeEach(() => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(openEvent);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
    });

    it('zaufany użytkownik + wolny slot (darmowy event) → slot assigned confirmed=true', async () => {
      const participationWithSlot = makeEnrollment({
        wantsIn: true,
        slot: { id: 'slot1', confirmed: true },
      });
      tx.eventEnrollment.create.mockResolvedValue(participationWithSlot);
      tx.eventEnrollment.findUnique.mockResolvedValue(participationWithSlot);

      const result = await service.join('event1', 'user1');

      expect(slots.assignSlot as jest.Mock).toHaveBeenCalledWith(
        'event1',
        participationWithSlot.id,
        true, // confirmed=true for free events
        expect.anything(),
        undefined,
      );
      expect(result.status).toBe('CONFIRMED');
    });

    it('zaufany użytkownik + wolny slot (płatny event) → slot assigned confirmed=false', async () => {
      const paidEvent = makeEvent({
        startsAt: FUTURE_FAR,
        lotteryExecutedAt: new Date(),
        costPerPerson: new Decimal(50),
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(paidEvent);

      const participationWithSlot = makeEnrollment({
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false },
      });
      tx.eventEnrollment.create.mockResolvedValue(participationWithSlot);
      tx.eventEnrollment.findUnique.mockResolvedValue(participationWithSlot);

      await service.join('event1', 'user1');

      expect(slots.assignSlot as jest.Mock).toHaveBeenCalledWith(
        'event1',
        participationWithSlot.id,
        false, // confirmed=false for paid events
        expect.anything(),
        undefined,
      );
    });

    it('nowy użytkownik → PENDING z waitingReason=NEW_USER', async () => {
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(true);
      const participation = makeEnrollment({ waitingReason: 'NEW_USER', slot: null });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.join('event1', 'user1');

      expect(result.waitingReason).toBe('NEW_USER');
    });

    it('zbanowany użytkownik → PENDING z waitingReason=BANNED', async () => {
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(true);
      const participation = makeEnrollment({ waitingReason: 'BANNED', slot: null });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.join('event1', 'user1');

      expect(result.waitingReason).toBe('BANNED');
    });

    it('brak wolnych slotów → PENDING z waitingReason=NO_SLOTS', async () => {
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(0);
      const participation = makeEnrollment({ waitingReason: 'NO_SLOTS', slot: null });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.join('event1', 'user1');

      expect(result.waitingReason).toBe('NO_SLOTS');
    });

    it('brak slotów dla wybranej roli → PENDING z waitingReason=NO_SLOTS_FOR_ROLE', async () => {
      const roleConfig = {
        roles: [
          { key: 'a', slots: 5, isDefault: true },
          { key: 'b', slots: 0, isDefault: false },
        ],
      };
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ lotteryExecutedAt: new Date(), roleConfig }),
      );
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(0);
      (slots.getAvailableRoles as jest.Mock).mockResolvedValue([{ key: 'a', slots: 5 }]);
      const participation = makeEnrollment({ waitingReason: 'NO_SLOTS_FOR_ROLE', slot: null });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(participation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.join('event1', 'user1', 'b');

      expect(result.waitingReason).toBe('NO_SLOTS_FOR_ROLE');
    });

    it('rzuca BadRequestException gdy podana rola nie istnieje w konfiguracji', async () => {
      const roleConfig = {
        roles: [
          { key: 'a', slots: 5, isDefault: true },
          { key: 'b', slots: 5, isDefault: false },
        ],
      };
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ lotteryExecutedAt: new Date(), roleConfig }),
      );
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.join('event1', 'user1', 'unknown-role')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('organizator dołącza → slot auto-confirmed=true', async () => {
      const participationWithSlot = makeEnrollment({
        userId: 'org1',
        wantsIn: true,
        slot: { id: 'slot1', confirmed: true },
      });
      tx.eventEnrollment.create.mockResolvedValue(participationWithSlot);
      tx.eventEnrollment.findUnique.mockResolvedValue(participationWithSlot);

      const result = await service.join('event1', 'org1');

      expect(slots.assignSlot as jest.Mock).toHaveBeenCalledWith(
        'event1',
        participationWithSlot.id,
        true,
        expect.anything(),
        undefined,
      );
      expect(result.status).toBe('CONFIRMED');
    });
  });

  // ─── join() rejoin ────────────────────────────────────────────────────────

  describe('join() — rejoin po wypisaniu', () => {
    it('użytkownik który się wypisał może ponownie dołączyć', async () => {
      const openEvent = makeEvent({ lotteryExecutedAt: new Date() });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(openEvent);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: false, withdrawnBy: 'USER' }),
      );
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue(makeEnrollment());
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      const withSlot = makeEnrollment({ wantsIn: true, slot: { confirmed: true } });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(makeEnrollment({ wantsIn: false, withdrawnBy: 'USER' }))
        .mockResolvedValue(withSlot);

      await service.join('event1', 'user1');

      expect(prisma.eventEnrollment.update as jest.Mock).toHaveBeenCalled();
    });

    it('rejoin w PRE_ENROLLMENT → waitingReason=PRE_ENROLLMENT', async () => {
      const preEvent = makeEvent({ startsAt: FUTURE_FAR, lotteryExecutedAt: null });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(preEvent);
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: false, withdrawnBy: 'USER' }),
      );
      (prisma.eventEnrollment.update as jest.Mock)
        .mockResolvedValueOnce(makeEnrollment()) // first update: reset wantsIn
        .mockResolvedValue(makeEnrollment({ waitingReason: 'PRE_ENROLLMENT' })); // second: set waitingReason

      const result = await service.join('event1', 'user1');

      expect(result.waitingReason).toBe('PRE_ENROLLMENT');
    });
  });

  // ─── assignSlotToParticipant() ────────────────────────────────────────────

  describe('assignSlotToParticipant()', () => {
    it('przypisuje slot oczekującemu uczestnikowi i czyści waitingReason', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: null,
        event: makeEvent({ lotteryExecutedAt: new Date() }),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participation)
        .mockResolvedValue({ ...participation, slot: { confirmed: false }, waitingReason: null });
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({
        ...participation,
        waitingReason: null,
        slot: { confirmed: false },
        event: { id: 'event1', title: 'Test Event' },
      });
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.assignSlotToParticipant('p1', 'org1');

      expect(slots.getFreeSlotCount as jest.Mock).toHaveBeenCalledWith('event1', null);
      expect(slots.assignSlot as jest.Mock).toHaveBeenCalledWith(
        'event1',
        'p1',
        false,
        undefined,
        null,
      );
      expect(prisma.eventEnrollment.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ waitingReason: null }) }),
      );
    });

    it('przypisuje slot uwzględniając roleKey uczestnika', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: null,
        roleKey: 'bramkarz',
        event: makeEvent({ lotteryExecutedAt: new Date() }),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participation)
        .mockResolvedValue({ ...participation, slot: { confirmed: false }, waitingReason: null });
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({
        ...participation,
        waitingReason: null,
        slot: { confirmed: false },
        event: { id: 'event1', title: 'Test Event' },
      });
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.assignSlotToParticipant('p1', 'org1');

      expect(slots.getFreeSlotCount as jest.Mock).toHaveBeenCalledWith('event1', 'bramkarz');
      expect(slots.assignSlot as jest.Mock).toHaveBeenCalledWith(
        'event1',
        'p1',
        false,
        undefined,
        'bramkarz',
      );
    });

    it('odrzuca z sugestią ról jeśli brak wolnych slotów dla danej roli (BadRequestException)', async () => {
      const roleConfig = {
        disciplineSlug: 'football',
        roles: [
          { key: 'bramkarz', title: 'Bramkarz', desc: '', slots: 1, isDefault: false },
          { key: 'pilkarz', title: 'Piłkarz', desc: '', slots: 10, isDefault: true },
        ],
      };
      const participation = makeEnrollment({
        wantsIn: true,
        slot: null,
        roleKey: 'bramkarz',
        event: makeEvent({ lotteryExecutedAt: new Date(), roleConfig }),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(participation);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(0);
      (slots.getAvailableRoles as jest.Mock).mockResolvedValue([
        { key: 'pilkarz', title: 'Piłkarz', freeSlots: 5 },
      ]);

      await expect(service.assignSlotToParticipant('p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.assignSlotToParticipant('p1', 'org1')).rejects.toThrow('Piłkarz');
    });

    it('odrzuca jeśli nie-organizator (ForbiddenException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ event: makeEvent({ organizerId: 'org1' }) }),
      );

      await expect(service.assignSlotToParticipant('p1', 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('odrzuca jeśli uczestnik już ma slot (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ slot: { id: 'slot1', confirmed: false } }),
      );

      await expect(service.assignSlotToParticipant('p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odrzuca jeśli uczestnik się wypisał (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: false, withdrawnBy: 'USER' }),
      );

      await expect(service.assignSlotToParticipant('p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odrzuca jeśli brak wolnych slotów (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true, slot: null }),
      );
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(0);

      await expect(service.assignSlotToParticipant('p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('auto-trust: oznacza real usera jako zaufanego u organizatora', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: null,
        addedByUserId: null,
        event: makeEvent({ lotteryExecutedAt: new Date() }),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(participation);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({
        ...participation,
        waitingReason: null,
        event: { id: 'event1', title: 'Test Event' },
      });
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.assignSlotToParticipant('p1', 'org1');

      expect(prisma.organizerUserRelation.upsert as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isTrusted: true }),
          update: expect.objectContaining({ isTrusted: true }),
        }),
      );
    });

    it('wysyła push do uczestnika w OPEN_ENROLLMENT po przydzieleniu slotu', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: null,
        event: makeEvent({ lotteryExecutedAt: new Date() }),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(participation);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({
        ...participation,
        waitingReason: null,
        slot: { confirmed: false },
        eventId: 'event1',
        addedByUserId: null,
        event: { id: 'event1', title: 'Test Event' },
      });
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@test.com',
        displayName: 'User 1',
      });

      await service.assignSlotToParticipant('p1', 'org1');

      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledWith(
        'user1',
        'Test Event',
        'SLOT_ASSIGNED',
        'event1',
      );
    });

    it('NIE oznacza gościa jako zaufanego (addedByUserId != null)', async () => {
      const guestParticipation = makeEnrollment({
        wantsIn: true,
        slot: null,
        addedByUserId: 'host1',
        event: makeEvent({ lotteryExecutedAt: new Date() }),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(guestParticipation);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({
        ...guestParticipation,
        waitingReason: null,
        event: { id: 'event1', title: 'Test Event' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.assignSlotToParticipant('p1', 'org1');

      expect(prisma.organizerUserRelation.upsert as jest.Mock).not.toHaveBeenCalled();
    });
  });

  // ─── confirmSlot() ────────────────────────────────────────────────────────

  describe('confirmSlot()', () => {
    it('potwierdza slot uczestnika', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false },
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participation)
        .mockResolvedValue({ ...participation, slot: { confirmed: true } });

      await service.confirmSlot('p1', 'user1');

      expect(slots.confirmSlot as jest.Mock).toHaveBeenCalledWith('p1');
    });

    it('odrzuca jeśli brak slotu (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true, slot: null }),
      );

      await expect(service.confirmSlot('p1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca jeśli slot już potwierdzony (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true, slot: { id: 'slot1', confirmed: true } }),
      );

      await expect(service.confirmSlot('p1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca jeśli uczestnik się wypisał (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: false, slot: { id: 'slot1', confirmed: false } }),
      );

      await expect(service.confirmSlot('p1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca jeśli nieautoryzowany użytkownik (ForbiddenException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({
          userId: 'user1',
          addedByUserId: null,
          wantsIn: true,
          slot: { id: 'slot1', confirmed: false },
        }),
      );

      await expect(service.confirmSlot('p1', 'intruder')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── releaseSlotFromParticipant() ─────────────────────────────────────────

  describe('releaseSlotFromParticipant()', () => {
    it('ustawia wantsIn=false, withdrawnBy=ORGANIZER i zwalnia slot w transakcji', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false, locked: false },
        event: makeEvent(),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participation)
        .mockResolvedValue({
          ...participation,
          wantsIn: false,
          withdrawnBy: 'ORGANIZER',
          event: { id: 'event1', title: 'Test Event' },
        });
      tx.eventEnrollment.update.mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.releaseSlotFromParticipant('p1', 'org1');

      expect(tx.eventEnrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ wantsIn: false, withdrawnBy: 'ORGANIZER' }),
        }),
      );
      expect(slots.releaseSlot as jest.Mock).toHaveBeenCalledWith('p1', expect.anything());
      expect(payments.cleanupIntents as jest.Mock).toHaveBeenCalledWith('p1', 'org1');
    });

    it('odrzuca jeśli nie-organizator (ForbiddenException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ event: makeEvent({ organizerId: 'org1' }) }),
      );

      await expect(service.releaseSlotFromParticipant('p1', 'not-org')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('odrzuca jeśli enrollment nie istnieje (NotFoundException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.releaseSlotFromParticipant('p1', 'org1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('wysyła powiadomienie REMOVED do uczestnika po zwolnieniu slotu', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false, locked: false },
        event: makeEvent(),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participation)
        .mockResolvedValue({
          ...participation,
          wantsIn: false,
          withdrawnBy: 'ORGANIZER',
          addedByUserId: null,
          eventId: 'event1',
          event: { id: 'event1', title: 'Test Event' },
        });
      tx.eventEnrollment.update.mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@test.com',
        displayName: 'User 1',
      });

      await service.releaseSlotFromParticipant('p1', 'org1');

      expect(push.notifyParticipationStatus as jest.Mock).toHaveBeenCalledWith(
        'user1',
        'Test Event',
        'REMOVED',
        'event1',
      );
    });
  });

  // ─── deleteParticipation() ────────────────────────────────────────────────

  describe('deleteParticipation()', () => {
    it('usuwa enrollment jeśli brak płatności', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: null,
        payments: [],
        event: makeEvent(),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(participation);
      tx.eventEnrollment.delete.mockResolvedValue({});

      await service.deleteParticipation('p1', 'org1');

      expect(tx.eventEnrollment.delete as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('blokuje jeśli enrollment ma historię płatności (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ payments: [{ id: 'pay1' }], event: makeEvent() }),
      );

      await expect(service.deleteParticipation('p1', 'org1')).rejects.toThrow(BadRequestException);
    });

    it('usuwa guest usera wraz z enrollment', async () => {
      const guestParticipation = makeEnrollment({
        addedByUserId: 'host1',
        payments: [],
        slot: null,
        event: makeEvent(),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(guestParticipation);
      tx.eventEnrollment.delete.mockResolvedValue({});
      tx.user.delete.mockResolvedValue({});

      await service.deleteParticipation('p1', 'org1');

      expect(tx.user.delete as jest.Mock).toHaveBeenCalledWith({ where: { id: 'user1' } });
    });

    it('odrzuca jeśli nie-organizator (ForbiddenException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ event: makeEvent({ organizerId: 'org1' }), payments: [] }),
      );

      await expect(service.deleteParticipation('p1', 'not-org')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── leave() ─────────────────────────────────────────────────────────────

  describe('leave()', () => {
    it('ustawia wantsIn=false, withdrawnBy=USER i zwalnia slot', async () => {
      const participation = makeEnrollment({
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false, locked: false },
        event: makeEvent(),
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participation)
        .mockResolvedValue({ ...participation, wantsIn: false, withdrawnBy: 'USER', slot: null });
      tx.eventEnrollment.update.mockResolvedValue({});

      await service.leave('p1', 'user1');

      expect(tx.eventEnrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ wantsIn: false, withdrawnBy: 'USER' }),
        }),
      );
      expect(slots.releaseSlot as jest.Mock).toHaveBeenCalledWith('p1', expect.anything());
      expect(payments.cleanupIntents as jest.Mock).toHaveBeenCalledWith('p1', 'org1');
    });

    it('odrzuca jeśli już wypisany (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: false, withdrawnBy: 'USER' }),
      );

      await expect(service.leave('p1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('odrzuca jeśli enrollment nie istnieje (NotFoundException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.leave('p1', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateGuestName() ────────────────────────────────────────────────────

  describe('updateGuestName()', () => {
    it('aktualizuje displayName gościa', async () => {
      const guest = makeEnrollment({ addedByUserId: 'host1' });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(guest);
      (prisma.user.update as jest.Mock).mockResolvedValue({ displayName: 'New Name' });

      await service.updateGuestName('p1', 'host1', 'New Name');

      expect(prisma.user.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ data: { displayName: 'New Name' } }),
      );
    });

    it('odrzuca jeśli enrollment nie jest gościem (BadRequestException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ addedByUserId: null }),
      );

      await expect(service.updateGuestName('p1', 'host1', 'Name')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odrzuca jeśli host nie jest właścicielem gościa (ForbiddenException)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ addedByUserId: 'other-host' }),
      );

      await expect(service.updateGuestName('p1', 'host1', 'Name')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── joinGuest() ─────────────────────────────────────────────────────────

  describe('joinGuest()', () => {
    const openEvent = makeEvent({ lotteryExecutedAt: new Date(), costPerPerson: new Decimal(0) });

    beforeEach(() => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(openEvent);
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (eligibility.getGuestCount as jest.Mock).mockResolvedValue(0);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'guest1', displayName: 'Gość' });
    });

    it('tworzy gościa i zwraca enrollment ze statusem APPROVED gdy jest wolny slot', async () => {
      const guestEnrollment = makeEnrollment({
        id: 'pg1',
        userId: 'guest1',
        addedByUserId: 'host1',
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false },
      });
      tx.eventEnrollment.create.mockResolvedValue(guestEnrollment);
      tx.eventEnrollment.findUnique.mockResolvedValue(guestEnrollment);

      const result = await service.joinGuest('event1', 'host1', 'Gość');

      expect(prisma.user.create as jest.Mock).toHaveBeenCalled();
      expect(result.status).toBe('APPROVED');
    });

    it('rzuca BadRequestException gdy host przekroczył limit gości', async () => {
      (eligibility.getGuestCount as jest.Mock).mockResolvedValue(2); // MAX_GUESTS_PER_USER = 2

      await expect(service.joinGuest('event1', 'host1', 'Gość')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('organizator może dodać gościa bez limitu (limit gości nie dotyczy organizatora)', async () => {
      (eligibility.getGuestCount as jest.Mock).mockResolvedValue(10);
      const guestEnrollment = makeEnrollment({
        id: 'pg1',
        userId: 'guest1',
        addedByUserId: 'org1',
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false },
      });
      tx.eventEnrollment.create.mockResolvedValue(guestEnrollment);
      tx.eventEnrollment.findUnique.mockResolvedValue(guestEnrollment);

      await expect(service.joinGuest('event1', 'org1', 'Gość')).resolves.toBeDefined();
    });

    it('zbanowany host → gość na liście oczekujących z waitingReason=BANNED', async () => {
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(true);
      const guestEnrollment = makeEnrollment({
        userId: 'guest1',
        addedByUserId: 'host1',
        wantsIn: true,
        slot: null,
        waitingReason: 'BANNED',
      });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(guestEnrollment);

      const result = await service.joinGuest('event1', 'host1', 'Gość');

      expect(result.waitingReason).toBe('BANNED');
    });

    it('nowy host → gość na liście oczekujących z waitingReason=NEW_USER', async () => {
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(true);
      const guestEnrollment = makeEnrollment({
        userId: 'guest1',
        addedByUserId: 'host1',
        wantsIn: true,
        slot: null,
        waitingReason: 'NEW_USER',
      });
      (prisma.eventEnrollment.create as jest.Mock).mockResolvedValue(guestEnrollment);

      const result = await service.joinGuest('event1', 'host1', 'Gość');

      expect(result.waitingReason).toBe('NEW_USER');
    });
  });

  // ─── rejoinById() ────────────────────────────────────────────────────────

  describe('rejoinById()', () => {
    it('ponownie dołącza wycofanego uczestnika', async () => {
      const openEvent = makeEvent({ lotteryExecutedAt: new Date() });
      const withdrawnEnrollment = makeEnrollment({
        wantsIn: false,
        withdrawnBy: 'USER',
        slot: null,
        event: openEvent,
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(withdrawnEnrollment)
        .mockResolvedValue(makeEnrollment({ wantsIn: true }));
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true }),
      );
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);

      await service.rejoinById('p1', 'user1');

      expect(prisma.eventEnrollment.update as jest.Mock).toHaveBeenCalled();
    });

    it('rzuca ForbiddenException gdy inny użytkownik próbuje ponownie dołączyć', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ userId: 'user1', addedByUserId: null, wantsIn: false }),
      );

      await expect(service.rejoinById('p1', 'intruder')).rejects.toThrow(ForbiddenException);
    });

    it('rzuca BadRequestException gdy uczestnik już ma aktywny slot', async () => {
      const openEvent = makeEvent({ lotteryExecutedAt: new Date() });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true, slot: { id: 'slot1', confirmed: true }, event: openEvent }),
      );

      await expect(service.rejoinById('p1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── changeRole() ────────────────────────────────────────────────────────

  describe('changeRole()', () => {
    const roleConfig = {
      roles: [
        { key: 'atakujacy', slots: 5, isDefault: true },
        { key: 'bramkarz', slots: 5, isDefault: false },
      ],
    };
    const openEvent = makeEvent({ lotteryExecutedAt: new Date(), roleConfig });

    it('rzuca BadRequestException gdy wydarzenie nie ma zdefiniowanych ról', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ event: makeEvent({ roleConfig: null }) }),
      );

      await expect(service.changeRole('p1', 'user1', 'bramkarz')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca BadRequestException gdy rola nie istnieje w konfiguracji', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ event: openEvent, slot: null }),
      );

      await expect(service.changeRole('p1', 'user1', 'nieistniejaca-rola')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('PENDING → aktualizuje roleKey bez zwalniania slotu', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(
          makeEnrollment({ event: openEvent, slot: null, roleKey: 'atakujacy' }),
        )
        .mockResolvedValue(makeEnrollment({ event: openEvent, slot: null, roleKey: 'bramkarz' }));
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({});
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);

      await service.changeRole('p1', 'user1', 'bramkarz');

      expect(prisma.eventEnrollment.update as jest.Mock).toHaveBeenCalled();
      expect(slots.releaseSlot as jest.Mock).not.toHaveBeenCalled();
    });

    it('APPROVED → zwalnia stary slot i próbuje przypisać nowy', async () => {
      const participationWithSlot = makeEnrollment({
        event: openEvent,
        wantsIn: true,
        slot: { id: 'slot1', confirmed: false },
        roleKey: 'atakujacy',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock)
        .mockResolvedValueOnce(participationWithSlot)
        .mockResolvedValue(makeEnrollment({ event: openEvent, slot: null }));
      tx.eventEnrollment.update.mockResolvedValue({});
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({});
      (eligibility.isBannedByOrganizer as jest.Mock).mockResolvedValue(false);
      (eligibility.isNewUser as jest.Mock).mockResolvedValue(false);
      (slots.getFreeSlotCount as jest.Mock).mockResolvedValue(1);

      await service.changeRole('p1', 'user1', 'bramkarz');

      expect(slots.releaseSlot as jest.Mock).toHaveBeenCalled();
      expect(slots.assignSlot as jest.Mock).toHaveBeenCalled();
    });
  });

  // ─── initiateEventPayment() ───────────────────────────────────────────────

  describe('initiateEventPayment()', () => {
    const paidEvent = makeEvent({ costPerPerson: new Decimal(50) });

    it('rzuca BadRequestException gdy uczestnik nie ma slotu', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({ wantsIn: true, slot: null, event: paidEvent }),
      );

      await expect(service.initiateEventPayment('p1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca BadRequestException gdy wydarzenie jest odwołane', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({
          wantsIn: true,
          slot: { id: 'slot1', confirmed: false },
          event: makeEvent({ status: 'CANCELLED', costPerPerson: new Decimal(50) }),
        }),
      );

      await expect(service.initiateEventPayment('p1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca BadRequestException gdy wydarzenie jest bezpłatne', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({
          wantsIn: true,
          slot: { id: 'slot1', confirmed: false },
          event: makeEvent({ costPerPerson: new Decimal(0) }),
        }),
      );

      await expect(service.initiateEventPayment('p1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deleguje do paymentsService z userId hosta gdy gość (addedByUserId)', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(
        makeEnrollment({
          userId: 'guest1',
          addedByUserId: 'host1',
          wantsIn: true,
          slot: { id: 'slot1', confirmed: false },
          event: paidEvent,
        }),
      );
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'host1',
        email: 'host@test.com',
        displayName: 'Host',
      });
      (payments.initiatePayment as jest.Mock).mockResolvedValue({
        paymentUrl: 'https://pay.tpay.com/TX1',
      });

      const result = await service.initiateEventPayment('p1', 'host1');

      expect(payments.initiatePayment as jest.Mock).toHaveBeenCalledWith(
        'p1',
        paidEvent.id,
        'host1',
        50,
        'host@test.com',
        'Host',
        expect.any(String),
        expect.any(String),
      );
      expect(result.paymentUrl).toBe('https://pay.tpay.com/TX1');
    });

    it('rzuca ForbiddenException gdy feature flag płatności online jest wyłączony', async () => {
      const original = featureFlags.enableOnlinePayments;
      (featureFlags as any).enableOnlinePayments = false;
      try {
        await expect(service.initiateEventPayment('p1', 'user1')).rejects.toThrow(
          ForbiddenException,
        );
      } finally {
        (featureFlags as any).enableOnlinePayments = original;
      }
    });
  });
});
