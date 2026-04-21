import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CoverImagesService } from '../cover-images/cover-images.service';
import { CitySubscriptionsService } from '../city-subscriptions/city-subscriptions.service';
import { SlotService } from '../slots/slot.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { EventsService } from './events.service';
import { mockAuthUser } from '../../tests/test-helpers';

function buildTxMock() {
  return {
    event: { update: jest.fn() },
    eventEnrollment: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    eventSlot: { updateMany: jest.fn() },
    organizerVoucher: { create: jest.fn() },
    payment: { update: jest.fn(), delete: jest.fn() },
    paymentIntent: { findMany: jest.fn().mockResolvedValue([]), delete: jest.fn() },
  };
}

function buildPrismaMock() {
  const tx = buildTxMock();
  return {
    event: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventEnrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    eventSlot: { findMany: jest.fn() },
    payment: { create: jest.fn(), findFirst: jest.fn() },
    city: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: any) => any) => fn(tx)),
    _tx: tx,
  } as unknown as PrismaService & { _tx: ReturnType<typeof buildTxMock> };
}

function buildSlotMock() {
  return {
    createSlotsForEvent: jest.fn().mockResolvedValue(undefined),
    validateMaxParticipantsChange: jest.fn().mockResolvedValue(null),
    adjustSlotsForMaxParticipants: jest.fn().mockResolvedValue(undefined),
    reconcileSlotsForRoleConfig: jest.fn().mockResolvedValue(undefined),
  } as unknown as SlotService;
}

function buildRealtimeMock() {
  return { invalidateEvent: jest.fn() } as unknown as EventRealtimeService;
}

function buildNotificationsMock() {
  return { create: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
}

function buildCoverImagesMock() {
  return {
    findRandomByDiscipline: jest.fn().mockResolvedValue(null),
  } as unknown as CoverImagesService;
}

function buildCitySubsMock() {
  return {
    getSubscriberIds: jest.fn().mockResolvedValue([]),
  } as unknown as CitySubscriptionsService;
}

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event1',
    organizerId: 'org1',
    title: 'Test Event',
    status: 'ACTIVE',
    costPerPerson: new Decimal(0),
    maxParticipants: 10,
    startsAt: FUTURE,
    endsAt: new Date(FUTURE.getTime() + 3600000),
    lotteryExecutedAt: null,
    roleConfig: null,
    citySlug: 'warszawa',
    ...overrides,
  };
}

function makeCreateEventDto(overrides: Record<string, unknown> = {}) {
  return {
    title: 'New Event',
    description: 'Description',
    startsAt: FUTURE.toISOString(),
    endsAt: new Date(FUTURE.getTime() + 3600000).toISOString(),
    disciplineSlug: 'pilka-nozna',
    facilitySlug: 'stadion',
    levelSlug: 'beginner',
    citySlug: 'warszawa',
    maxParticipants: 10,
    minParticipants: 2,
    costPerPerson: 0,
    gender: 'ANY',
    visibility: 'PUBLIC',
    ...overrides,
  } as any;
}

describe('EventsService', () => {
  let service: EventsService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let tx: ReturnType<typeof buildTxMock>;
  let slots: ReturnType<typeof buildSlotMock>;
  let realtime: ReturnType<typeof buildRealtimeMock>;
  let notifications: ReturnType<typeof buildNotificationsMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    tx = (prisma as any)._tx;
    slots = buildSlotMock();
    realtime = buildRealtimeMock();
    notifications = buildNotificationsMock();
    service = new EventsService(
      prisma as PrismaService,
      {
        sendNewApplicationEmail: jest.fn(),
        sendEventCancelledEmail: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        notifyNewEventInCity: jest.fn().mockResolvedValue(undefined),
        notifyEventCancelled: jest.fn().mockResolvedValue(undefined),
      } as any,
      notifications,
      buildCoverImagesMock(),
      buildCitySubsMock(),
      slots,
      realtime,
      { isBannedByOrganizer: jest.fn(), isNewUser: jest.fn() } as any,
    );
    jest.clearAllMocks();
  });

  // ─── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('tworzy wydarzenie i wywołuje createSlotsForEvent', async () => {
      const event = makeEvent();
      (prisma.event.create as jest.Mock).mockResolvedValue(event);

      await service.create('org1', makeCreateEventDto());

      expect(prisma.event.create as jest.Mock).toHaveBeenCalled();
      expect(slots.createSlotsForEvent as jest.Mock).toHaveBeenCalledWith('event1', 10, undefined);
    });

    it('rzuca BadRequestException gdy suma slotów ról !== maxParticipants', async () => {
      const dto = makeCreateEventDto({
        maxParticipants: 10,
        roleConfig: {
          roles: [
            { key: 'a', slots: 5, isDefault: true },
            { key: 'b', slots: 3, isDefault: false },
          ],
        },
      });

      await expect(service.create('org1', dto)).rejects.toThrow(BadRequestException);
    });

    it('rzuca BadRequestException gdy brak domyślnej roli w roleConfig', async () => {
      const dto = makeCreateEventDto({
        maxParticipants: 10,
        roleConfig: {
          roles: [
            { key: 'a', slots: 5, isDefault: false },
            { key: 'b', slots: 5, isDefault: false },
          ],
        },
      });

      await expect(service.create('org1', dto)).rejects.toThrow(BadRequestException);
    });

    it('rzuca BadRequestException gdy więcej niż jedna rola domyślna', async () => {
      const dto = makeCreateEventDto({
        maxParticipants: 10,
        roleConfig: {
          roles: [
            { key: 'a', slots: 5, isDefault: true },
            { key: 'b', slots: 5, isDefault: true },
          ],
        },
      });

      await expect(service.create('org1', dto)).rejects.toThrow(BadRequestException);
    });

    it('ustawia lotteryExecutedAt=now gdy event zaczyna się w ciągu 48h', async () => {
      const nearFuture = new Date(Date.now() + 60 * 60 * 1000);
      const dto = makeCreateEventDto({
        startsAt: nearFuture.toISOString(),
        endsAt: new Date(nearFuture.getTime() + 3600000).toISOString(),
      });
      (prisma.event.create as jest.Mock).mockResolvedValue(makeEvent({ startsAt: nearFuture }));

      await service.create('org1', dto);

      const createCall = (prisma.event.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.lotteryExecutedAt).toBeTruthy();
    });

    it('ustawia lotteryExecutedAt=null gdy event zaczyna się po ponad 48h', async () => {
      (prisma.event.create as jest.Mock).mockResolvedValue(makeEvent());

      await service.create('org1', makeCreateEventDto());

      const createCall = (prisma.event.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.lotteryExecutedAt).toBeNull();
    });
  });

  // ─── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('aktualizuje wydarzenie jako organizator', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.event.update as jest.Mock).mockResolvedValue(makeEvent({ title: 'Updated' }));

      await service.update('event1', mockAuthUser('org1'), { title: 'Updated' });

      expect(prisma.event.update as jest.Mock).toHaveBeenCalled();
      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'all');
    });

    it('odrzuca nie-organizatora (ForbiddenException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());

      await expect(service.update('event1', mockAuthUser('not-org'), {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('odrzuca jeśli event nie istnieje (NotFoundException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', mockAuthUser('org1'), {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('odrzuca edycję événtu po jego rozpoczęciu (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ startsAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.update('event1', mockAuthUser('org1'), {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('synchronizuje sloty przy zmianie maxParticipants', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ maxParticipants: 10 }));
      (slots.validateMaxParticipantsChange as jest.Mock).mockResolvedValue(null);
      (prisma.event.update as jest.Mock).mockResolvedValue(makeEvent({ maxParticipants: 15 }));

      await service.update('event1', mockAuthUser('org1'), { maxParticipants: 15 } as any);

      expect(slots.adjustSlotsForMaxParticipants as jest.Mock).toHaveBeenCalledWith(
        'event1',
        10,
        15,
      );
    });

    it('blokuje zmianę maxParticipants jeśli za mało miejsc (validateMaxParticipantsChange)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ maxParticipants: 10 }));
      (slots.validateMaxParticipantsChange as jest.Mock).mockResolvedValue(
        'Nie można zmniejszyć liczby miejsc',
      );

      await expect(
        service.update('event1', mockAuthUser('org1'), { maxParticipants: 5 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('odrzuca edycję eventu ze statusem CANCELLED (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ status: 'CANCELLED' }));

      await expect(service.update('event1', mockAuthUser('org1'), {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('wywołuje reconcileSlotsForRoleConfig przy zmianie roleConfig', async () => {
      const roleConfig = {
        roles: [
          { key: 'a', slots: 5, isDefault: true },
          { key: 'b', slots: 5, isDefault: false },
        ],
      };
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ roleConfig }));
      (prisma.event.update as jest.Mock).mockResolvedValue(makeEvent({ roleConfig }));

      await service.update('event1', mockAuthUser('org1'), { roleConfig } as any);

      expect(slots.reconcileSlotsForRoleConfig as jest.Mock).toHaveBeenCalledWith(
        'event1',
        roleConfig,
      );
    });
  });

  // ─── findAll() ────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    beforeEach(() => {
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.event.count as jest.Mock).mockResolvedValue(0);
    });

    it('zwraca events bez filtrów', async () => {
      (prisma.event.findMany as jest.Mock).mockResolvedValue([makeEvent()]);
      (prisma.event.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({} as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filtruje po citySlug gdy city istnieje', async () => {
      (prisma.city.findUnique as jest.Mock).mockResolvedValue({ slug: 'warszawa' });

      await service.findAll({ citySlug: 'warszawa' } as any);

      expect(prisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ city: { slug: 'warszawa' } }),
        }),
      );
    });

    it('rzuca NotFoundException dla nieznanego citySlug', async () => {
      (prisma.city.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findAll({ citySlug: 'nieznane' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('filtruje po disciplineSlug', async () => {
      await service.findAll({ disciplineSlug: 'pilka-nozna' } as any);

      expect(prisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ discipline: { slug: 'pilka-nozna' } }),
        }),
      );
    });

    it('sortuje po createdAt desc gdy sortBy=newest', async () => {
      await service.findAll({ sortBy: 'newest' } as any);

      expect(prisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('domyślnie filtruje po statusach ACTIVE i CANCELLED', async () => {
      await service.findAll({} as any);

      expect(prisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['ACTIVE', 'CANCELLED'] },
          }),
        }),
      );
    });
  });

  // ─── findOne() ────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('zwraca wydarzenie z eventTimeStatus i enrollmentPhase', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());

      const result = await service.findOne('event1');

      expect(result.eventTimeStatus).toBeDefined();
      expect(result.enrollmentPhase).toBeDefined();
    });

    it('zwraca currentUserAccess gdy userId podany i nie jest organizatorem', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ organizerId: 'org1' }));
      const eligibilityMock = {
        isBannedByOrganizer: jest.fn(),
        isNewUser: jest.fn().mockResolvedValue(false),
      };
      service = new EventsService(
        prisma as PrismaService,
        {
          sendNewApplicationEmail: jest.fn(),
          sendEventCancelledEmail: jest.fn().mockResolvedValue(undefined),
        } as any,
        {
          notifyNewEventInCity: jest.fn().mockResolvedValue(undefined),
          notifyEventCancelled: jest.fn().mockResolvedValue(undefined),
        } as any,
        notifications,
        buildCoverImagesMock(),
        buildCitySubsMock(),
        slots,
        realtime,
        eligibilityMock as any,
      );

      const result = await service.findOne('event1', 'user1');

      expect(result.currentUserAccess).not.toBeNull();
      expect(eligibilityMock.isNewUser).toHaveBeenCalledWith('user1', 'org1');
    });

    it('rzuca NotFoundException gdy event nie istnieje', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancel() ─────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('anuluje wydarzenie i wystawia vouchery dla opłaconych uczestników', async () => {
      const event = makeEvent({ costPerPerson: new Decimal(50) });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      tx.event.update.mockResolvedValue({ ...event, status: 'CANCELLED' });
      tx.eventEnrollment.findMany
        .mockResolvedValueOnce([
          {
            id: 'p1',
            userId: 'user1',
            payments: [{ id: 'pay1', amount: new Decimal(50), status: 'COMPLETED' }],
          },
        ])
        .mockResolvedValue([]); // waiting participants: none
      tx.payment.update.mockResolvedValue({});
      tx.eventEnrollment.update.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      tx.organizerVoucher.create.mockResolvedValue({});
      // Outside transaction: participants for notifications
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.cancel('event1', mockAuthUser('org1'));

      expect(tx.event.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
      expect(tx.organizerVoucher.create).toHaveBeenCalled();
    });

    it('rzuca BadRequestException jeśli event już CANCELLED', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ status: 'CANCELLED' }));

      await expect(service.cancel('event1', mockAuthUser('org1'))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odrzuca nie-organizatora (ForbiddenException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());

      await expect(service.cancel('event1', mockAuthUser('not-org'))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('odrzuca jeśli event nie istnieje (NotFoundException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('nonexistent', mockAuthUser('org1'))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('zwraca statystyki refundedParticipants i cleanedUpIntents', async () => {
      const event = makeEvent({ costPerPerson: new Decimal(50) });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      tx.event.update.mockResolvedValue({ ...event, status: 'CANCELLED', id: 'event1' });
      tx.eventEnrollment.findMany
        .mockResolvedValueOnce([
          {
            id: 'p1',
            userId: 'user1',
            payments: [{ id: 'pay1', amount: new Decimal(50), status: 'COMPLETED' }],
          },
        ])
        .mockResolvedValueOnce([]);
      tx.payment.update.mockResolvedValue({});
      tx.eventEnrollment.update.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      tx.organizerVoucher.create.mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.cancel('event1', mockAuthUser('org1'));

      expect(result.refundedParticipants).toBe(1);
      expect(result.cleanedUpIntents).toBe(0);
    });

    it('czyści paymentIntenty dla oczekujących uczestników', async () => {
      const event = makeEvent();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      tx.event.update.mockResolvedValue({ ...event, status: 'CANCELLED' });
      tx.eventEnrollment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'p1', userId: 'user1' }]);
      tx.paymentIntent.findMany.mockResolvedValue([
        { id: 'intent1', voucherReserved: new Decimal(0) },
      ]);
      tx.paymentIntent.delete.mockResolvedValue({});
      tx.eventEnrollment.update.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.cancel('event1', mockAuthUser('org1'));

      expect(tx.paymentIntent.delete).toHaveBeenCalledWith({ where: { id: 'intent1' } });
      expect(result.cleanedUpIntents).toBe(1);
    });

    it('wysyła powiadomienia push i email do uczestników', async () => {
      const pushMock = {
        notifyEventCancelled: jest.fn().mockResolvedValue(undefined),
        notifyNewEventInCity: jest.fn(),
      };
      const emailMock = {
        sendEventCancelledEmail: jest.fn().mockResolvedValue(undefined),
        sendNewApplicationEmail: jest.fn(),
      };
      service = new EventsService(
        prisma as PrismaService,
        emailMock as any,
        pushMock as any,
        notifications,
        buildCoverImagesMock(),
        buildCitySubsMock(),
        slots,
        realtime,
        { isBannedByOrganizer: jest.fn(), isNewUser: jest.fn() } as any,
      );
      const event = makeEvent();
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      tx.event.update.mockResolvedValue({ ...event, status: 'CANCELLED' });
      tx.eventEnrollment.findMany.mockResolvedValue([]);
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([
        { user: { id: 'user1', email: 'user@test.com', displayName: 'User 1' } },
      ]);

      await service.cancel('event1', mockAuthUser('org1'));

      expect(pushMock.notifyEventCancelled).toHaveBeenCalledWith('user1', event.title, 'event1');
      expect(emailMock.sendEventCancelledEmail).toHaveBeenCalledWith(
        'user@test.com',
        'User 1',
        event.title,
      );
    });
  });

  // ─── remove() ─────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('usuwa wydarzenie jeśli brak uczestników (nie-admin)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.eventEnrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.event.delete as jest.Mock).mockResolvedValue({});

      await service.remove('event1', mockAuthUser('org1'));

      expect(prisma.event.delete as jest.Mock).toHaveBeenCalledWith({ where: { id: 'event1' } });
    });

    it('blokuje usunięcie jeśli są uczestnicy (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.eventEnrollment.count as jest.Mock).mockResolvedValue(5);

      await expect(service.remove('event1', mockAuthUser('org1'))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('admin może usunąć wydarzenie z uczestnikami', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.event.delete as jest.Mock).mockResolvedValue({});

      await service.remove('event1', mockAuthUser('other-user', 'ADMIN'));

      expect(prisma.event.delete as jest.Mock).toHaveBeenCalled();
    });

    it('odrzuca nie-organizatora (ForbiddenException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ organizerId: 'org1' }));
      (prisma.eventEnrollment.count as jest.Mock).mockResolvedValue(0);

      await expect(service.remove('event1', mockAuthUser('not-org'))).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── markPaid() ───────────────────────────────────────────────────────────

  describe('markPaid()', () => {
    it('tworzy Payment COMPLETED (gotówka) i invaliduje event', async () => {
      const event = makeEvent({ costPerPerson: new Decimal(50) });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      (prisma.eventEnrollment.findFirst as jest.Mock).mockResolvedValue({
        id: 'p1',
        userId: 'user1',
        slot: { id: 'slot1', confirmed: true },
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.markPaid('event1', 'p1', mockAuthUser('org1'));

      expect(prisma.payment.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: 'cash', status: 'COMPLETED' }),
        }),
      );
      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'participants');
    });

    it('odrzuca jeśli uczestnik nie ma slotu (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(
        makeEvent({ costPerPerson: new Decimal(50) }),
      );
      (prisma.eventEnrollment.findFirst as jest.Mock).mockResolvedValue({
        id: 'p1',
        userId: 'user1',
        slot: null,
      });

      await expect(service.markPaid('event1', 'p1', mockAuthUser('org1'))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odrzuca nie-organizatora (ForbiddenException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());

      await expect(service.markPaid('event1', 'p1', mockAuthUser('not-org'))).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── cancelPayment() ──────────────────────────────────────────────────────

  describe('cancelPayment()', () => {
    const completedPayment = {
      id: 'pay1',
      userId: 'user1',
      enrollmentId: 'p1',
      amount: new Decimal(50),
      status: 'COMPLETED',
      method: 'tpay',
      enrollment: { id: 'p1' },
    };

    it('anuluje płatność tpay z refundem na voucher', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(completedPayment);
      tx.payment.update.mockResolvedValue({});
      tx.organizerVoucher.create.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.cancelPayment('event1', 'pay1', mockAuthUser('org1'), {
        refundAsVoucher: true,
      });

      expect(tx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'VOUCHER_REFUNDED' }),
        }),
      );
      expect(tx.organizerVoucher.create).toHaveBeenCalled();
    });

    it('anuluje płatność gotówkową bez vouchera (delete payment)', async () => {
      const cashPayment = { ...completedPayment, method: 'cash' };
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(cashPayment);
      tx.payment.delete.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.cancelPayment('event1', 'pay1', mockAuthUser('org1'), {});

      expect(tx.payment.delete).toHaveBeenCalledWith({ where: { id: 'pay1' } });
    });

    it('odrzuca jeśli płatność nie ma statusu COMPLETED (BadRequestException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        ...completedPayment,
        status: 'PENDING',
      });

      await expect(
        service.cancelPayment('event1', 'pay1', mockAuthUser('org1'), {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('odrzuca nie-organizatora (ForbiddenException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());

      await expect(
        service.cancelPayment('event1', 'pay1', mockAuthUser('not-org'), {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('gotówka smart default (pusty dto): usuwa bez powiadomienia', async () => {
      const cashPayment = { ...completedPayment, method: 'cash' };
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(cashPayment);
      tx.payment.delete.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.cancelPayment('event1', 'pay1', mockAuthUser('org1'), {});

      expect(notifications.create as jest.Mock).not.toHaveBeenCalled();
    });

    it('tpay smart default (pusty dto): voucher refund + powiadomienie', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(completedPayment);
      tx.payment.update.mockResolvedValue({});
      tx.organizerVoucher.create.mockResolvedValue({});
      tx.eventSlot.updateMany.mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.cancelPayment('event1', 'pay1', mockAuthUser('org1'), {});

      expect(tx.organizerVoucher.create).toHaveBeenCalled();
      expect(notifications.create as jest.Mock).toHaveBeenCalled();
    });
  });
});
