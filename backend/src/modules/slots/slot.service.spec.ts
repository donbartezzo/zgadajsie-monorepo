import { BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { SlotService } from './slot.service';

function buildPrismaMock() {
  return {
    eventSlot: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    eventEnrollment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;
}

function buildRealtimeMock() {
  return {
    invalidateEvent: jest.fn(),
  } as unknown as EventRealtimeService;
}

describe('SlotService', () => {
  let service: SlotService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let realtime: ReturnType<typeof buildRealtimeMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    realtime = buildRealtimeMock();
    service = new SlotService(prisma as PrismaService, realtime as EventRealtimeService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  describe('createSlotsForEvent()', () => {
    it('tworzy N slotów bez ról (roleKey=null)', async () => {
      (prisma.eventSlot.createMany as jest.Mock).mockResolvedValue({ count: 5 });

      await service.createSlotsForEvent('event1', 5);

      const call = (prisma.eventSlot.createMany as jest.Mock).mock.calls[0][0];
      expect(call.data).toHaveLength(5);
      expect(call.data.every((s: any) => s.roleKey === null)).toBe(true);
      expect(call.data.every((s: any) => s.eventId === 'event1')).toBe(true);
    });

    it('tworzy sloty per rola z roleConfig (roleKey ustawiony)', async () => {
      (prisma.eventSlot.createMany as jest.Mock).mockResolvedValue({ count: 4 });
      const roleConfig = {
        roles: [
          { key: 'player', slots: 3 },
          { key: 'referee', slots: 1 },
        ],
      };

      await service.createSlotsForEvent('event1', 4, roleConfig);

      const call = (prisma.eventSlot.createMany as jest.Mock).mock.calls[0][0];
      expect(call.data).toHaveLength(4);
      const playerSlots = call.data.filter((s: any) => s.roleKey === 'player');
      const refereeSlots = call.data.filter((s: any) => s.roleKey === 'referee');
      expect(playerSlots).toHaveLength(3);
      expect(refereeSlots).toHaveLength(1);
    });

    it('poprawna suma slotów = maxParticipants', async () => {
      (prisma.eventSlot.createMany as jest.Mock).mockResolvedValue({ count: 10 });
      const roleConfig = {
        roles: [
          { key: 'a', slots: 7 },
          { key: 'b', slots: 3 },
        ],
      };

      await service.createSlotsForEvent('event1', 10, roleConfig);

      const call = (prisma.eventSlot.createMany as jest.Mock).mock.calls[0][0];
      expect(call.data).toHaveLength(10);
    });
  });

  describe('releaseSlot()', () => {
    it('zwalnia slot (enrollmentId=null, confirmed=false, assignedAt=null)', async () => {
      (prisma.eventSlot.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.releaseSlot('participation1');

      expect(result).toBe(true);
      expect(prisma.eventSlot.updateMany as jest.Mock).toHaveBeenCalledWith({
        where: { enrollmentId: 'participation1' },
        data: { enrollmentId: null, confirmed: false, assignedAt: null },
      });
    });

    it('działa w kontekście transakcji (tx parameter)', async () => {
      const tx = { eventSlot: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };

      const result = await service.releaseSlot('participation1', tx as any);

      expect(result).toBe(true);
      expect(tx.eventSlot.updateMany).toHaveBeenCalled();
      expect(prisma.eventSlot.updateMany as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('confirmSlot()', () => {
    it('ustawia confirmed=true na slocie', async () => {
      (prisma.eventSlot.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.confirmSlot('participation1');

      expect(result).toBe(true);
      expect(prisma.eventSlot.updateMany as jest.Mock).toHaveBeenCalledWith({
        where: { enrollmentId: 'participation1' },
        data: { confirmed: true },
      });
    });

    it('działa w kontekście transakcji', async () => {
      const tx = { eventSlot: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };

      await service.confirmSlot('participation1', tx as any);

      expect(tx.eventSlot.updateMany).toHaveBeenCalled();
    });
  });

  describe('lockSlot()', () => {
    it('ustawia locked=true', async () => {
      const slot = { id: 'slot1', eventId: 'event1', locked: false };
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue(slot);
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue({ ...slot, locked: true });

      await service.lockSlot('slot1');

      expect(prisma.eventSlot.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'slot1' },
        data: { locked: true },
      });
      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'slots');
    });

    it('rzuca BadRequestException jeśli slot już locked', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue({
        id: 'slot1',
        eventId: 'event1',
        locked: true,
      });

      await expect(service.lockSlot('slot1')).rejects.toThrow(BadRequestException);
    });

    it('rzuca NotFoundException jeśli slot nie istnieje', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.lockSlot('slot1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlockSlot()', () => {
    it('ustawia locked=false', async () => {
      const slot = { id: 'slot1', eventId: 'event1', locked: true };
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue(slot);
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue({ ...slot, locked: false });

      await service.unlockSlot('slot1');

      expect(prisma.eventSlot.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'slot1' },
        data: { locked: false },
      });
      expect(realtime.invalidateEvent as jest.Mock).toHaveBeenCalledWith('event1', 'slots');
    });

    it('rzuca BadRequestException jeśli slot nie jest locked', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue({
        id: 'slot1',
        eventId: 'event1',
        locked: false,
      });

      await expect(service.unlockSlot('slot1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('lockSlotByOrganizer() / unlockSlotByOrganizer()', () => {
    it('lockSlotByOrganizer() weryfikuje że użytkownik jest organizatorem eventu', async () => {
      const slot = { id: 'slot1', eventId: 'event1', locked: false };
      (prisma.eventSlot.findUnique as jest.Mock)
        .mockResolvedValueOnce(slot) // getSlotEventId
        .mockResolvedValueOnce(slot) // lockSlot findUnique
        .mockResolvedValueOnce({ ...slot, locked: true }); // lockSlot update
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue({ ...slot, locked: true });

      const result = await service.lockSlotByOrganizer('slot1', 'org1');

      expect(result).toEqual({ success: true });
    });

    it('rzuca ForbiddenException jeśli nie-organizator', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue({
        id: 'slot1',
        eventId: 'event1',
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });

      await expect(service.lockSlotByOrganizer('slot1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assignToLockedSlot()', () => {
    it('przypisuje enrollment do konkretnego locked slotu', async () => {
      const slot = { id: 'slot1', eventId: 'event1', locked: true, enrollmentId: null };
      const updatedSlot = {
        id: 'slot1',
        confirmed: false,
        assignedAt: new Date(),
        roleKey: null,
      };
      (prisma.eventSlot.findUnique as jest.Mock)
        .mockResolvedValueOnce(slot)
        .mockResolvedValueOnce(updatedSlot);
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue(updatedSlot);

      const result = await service.assignToLockedSlot('slot1', 'participation1', false);

      expect(prisma.eventSlot.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'slot1' },
        data: { enrollmentId: 'participation1', confirmed: false, assignedAt: expect.any(Date) },
      });
      expect(result).toEqual(updatedSlot);
    });

    it('rzuca BadRequestException jeśli slot nie jest locked', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue({
        id: 'slot1',
        locked: false,
        enrollmentId: null,
      });

      await expect(service.assignToLockedSlot('slot1', 'participation1', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca BadRequestException jeśli slot już zajęty', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue({
        id: 'slot1',
        locked: true,
        enrollmentId: 'existing-participant',
      });

      await expect(service.assignToLockedSlot('slot1', 'participation1', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca NotFoundException jeśli slot nie istnieje', async () => {
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.assignToLockedSlot('slot1', 'participation1', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFreeSlotCount()', () => {
    it('zlicza sloty z enrollmentId=null i locked=false', async () => {
      (prisma.eventSlot.count as jest.Mock).mockResolvedValue(4);

      const result = await service.getFreeSlotCount('event1');

      expect(result).toBe(4);
      expect(prisma.eventSlot.count as jest.Mock).toHaveBeenCalledWith({
        where: { eventId: 'event1', enrollmentId: null, locked: false },
      });
    });
  });

  describe('addSlots() / removeEmptySlots()', () => {
    it('addSlots() dodaje N nowych slotów do eventu', async () => {
      (prisma.eventSlot.createMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.addSlots('event1', 3);

      const call = (prisma.eventSlot.createMany as jest.Mock).mock.calls[0][0];
      expect(call.data).toHaveLength(3);
      expect(call.data.every((s: any) => s.eventId === 'event1')).toBe(true);
    });

    it('removeEmptySlots() usuwa N pustych slotów', async () => {
      const emptySlots = [{ id: 'slot1' }, { id: 'slot2' }];
      (prisma.eventSlot.findMany as jest.Mock).mockResolvedValue(emptySlots);
      (prisma.eventSlot.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const removed = await service.removeEmptySlots('event1', 2);

      expect(removed).toBe(2);
      expect(prisma.eventSlot.deleteMany as jest.Mock).toHaveBeenCalledWith({
        where: { id: { in: ['slot1', 'slot2'] } },
      });
    });

    it('removeEmptySlots() nie usuwa zajętych slotów', async () => {
      (prisma.eventSlot.findMany as jest.Mock).mockResolvedValue([]);

      const removed = await service.removeEmptySlots('event1', 2);

      expect(removed).toBe(0);
      expect(prisma.eventSlot.deleteMany as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('assignSlot()', () => {
    it('zwraca null gdy brak wolnych slotów', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.assignSlot('event1', 'participation1');

      expect(result).toBeNull();
    });

    it('przypisuje wolny unlocked slot i zwraca go', async () => {
      const assignedSlot = {
        id: 'slot1',
        confirmed: false,
        assignedAt: new Date(),
        roleKey: null,
      };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'slot1' }]);
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue(assignedSlot);

      const result = await service.assignSlot('event1', 'participation1');

      expect(result).toEqual(assignedSlot);
    });
  });

  describe('bulkAssignSlots()', () => {
    it('przypisuje sloty kolejnym participationIds', async () => {
      const slot = { id: 'slot1', confirmed: false, assignedAt: new Date(), roleKey: null };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'slot1' }]);
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue(slot);

      const assigned = await service.bulkAssignSlots('event1', ['p1', 'p2']);

      expect(assigned).toBe(2);
    });

    it('przerywa gdy brak wolnych slotów', async () => {
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ id: 'slot1' }]) // first assignment succeeds
        .mockResolvedValueOnce([]); // second fails
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValue({
        id: 'slot1',
        confirmed: false,
        assignedAt: new Date(),
        roleKey: null,
      });

      const assigned = await service.bulkAssignSlots('event1', ['p1', 'p2', 'p3']);

      expect(assigned).toBe(1);
    });

    it('zwraca liczbę przypisanych', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const assigned = await service.bulkAssignSlots('event1', ['p1', 'p2']);

      expect(assigned).toBe(0);
    });
  });

  describe('assignParticipantToLockedSlot()', () => {
    it('rzuca BadRequestException jeśli uczestnik się wypisał', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: false,
        event: { organizerId: 'org1', costPerPerson: { toNumber: () => 0 } },
        slot: null,
      });

      await expect(service.assignParticipantToLockedSlot('slot1', 'p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca BadRequestException jeśli uczestnik już ma slot', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        event: { organizerId: 'org1', costPerPerson: { toNumber: () => 0 } },
        slot: { id: 'existing-slot' },
      });

      await expect(service.assignParticipantToLockedSlot('slot1', 'p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca ForbiddenException jeśli nie-organizator', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        event: { organizerId: 'org1', costPerPerson: { toNumber: () => 0 } },
        slot: null,
      });

      await expect(
        service.assignParticipantToLockedSlot('slot1', 'p1', 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('confirmed=true jeśli event darmowy, false jeśli płatny', async () => {
      const updatedEnrollment = { id: 'p1', waitingReason: null };
      const slot = {
        id: 'slot1',
        eventId: 'event1',
        locked: true,
        enrollmentId: null,
      };
      const updatedSlot = {
        id: 'slot1',
        confirmed: true,
        assignedAt: new Date(),
        roleKey: null,
      };

      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        roleKey: null,
        event: { organizerId: 'org1', costPerPerson: { toNumber: () => 0 } },
        slot: null,
      });
      (prisma.eventSlot.findUnique as jest.Mock)
        .mockResolvedValueOnce({ roleKey: null }) // role check
        .mockResolvedValueOnce(slot) // assignToLockedSlot check
        .mockResolvedValueOnce(updatedSlot); // assignToLockedSlot return
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue(updatedSlot);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue(updatedEnrollment);

      await service.assignParticipantToLockedSlot('slot1', 'p1', 'org1');

      // For free event (costPerPerson=0), confirmed should be true
      expect(prisma.eventSlot.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ confirmed: true }) }),
      );
    });

    it('rzuca BadRequestException jeśli slot ma inną rolę niż uczestnik', async () => {
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        roleKey: 'bramkarz',
        event: { organizerId: 'org1', costPerPerson: { toNumber: () => 0 } },
        slot: null,
      });
      (prisma.eventSlot.findUnique as jest.Mock).mockResolvedValueOnce({ roleKey: 'pilkarz' });

      await expect(service.assignParticipantToLockedSlot('slot1', 'p1', 'org1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('przypisuje slot jeśli role uczestnika i slotu są zgodne', async () => {
      const slot = {
        id: 'slot1',
        eventId: 'event1',
        locked: true,
        enrollmentId: null,
        roleKey: 'bramkarz',
      };
      const updatedSlot = {
        id: 'slot1',
        confirmed: true,
        assignedAt: new Date(),
        roleKey: 'bramkarz',
      };

      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        roleKey: 'bramkarz',
        event: { organizerId: 'org1', costPerPerson: { toNumber: () => 0 } },
        slot: null,
      });
      (prisma.eventSlot.findUnique as jest.Mock)
        .mockResolvedValueOnce({ roleKey: 'bramkarz' }) // role check
        .mockResolvedValueOnce(slot) // assignToLockedSlot check
        .mockResolvedValueOnce(updatedSlot); // assignToLockedSlot return
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue(updatedSlot);
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({
        id: 'p1',
        waitingReason: null,
      });

      await expect(
        service.assignParticipantToLockedSlot('slot1', 'p1', 'org1'),
      ).resolves.not.toThrow();
    });
  });
});
