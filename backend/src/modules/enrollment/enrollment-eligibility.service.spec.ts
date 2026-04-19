import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';

function buildPrismaMock() {
  return {
    organizerUserRelation: {
      findUnique: jest.fn(),
    },
    eventEnrollment: {
      count: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('EnrollmentEligibilityService', () => {
  let service: EnrollmentEligibilityService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new EnrollmentEligibilityService(prisma as PrismaService);
    jest.clearAllMocks();
  });

  describe('isBannedByOrganizer()', () => {
    it('zwraca true jeśli relacja istnieje i isBanned=true', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({ isBanned: true });
      await expect(service.isBannedByOrganizer('user1', 'org1')).resolves.toBe(true);
    });

    it('zwraca false dla użytkownika bez relacji z organizatorem', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.isBannedByOrganizer('user1', 'org1')).resolves.toBe(false);
    });

    it('zwraca false jeśli relacja istnieje ale isBanned=false', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({ isBanned: false });
      await expect(service.isBannedByOrganizer('user1', 'org1')).resolves.toBe(false);
    });
  });

  describe('isNewUser()', () => {
    it('zwraca true gdy brak relacji z organizatorem (brak rekordu)', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.isNewUser('user1', 'org1')).resolves.toBe(true);
    });

    it('zwraca true gdy relacja istnieje ale isTrusted=false', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({
        isTrusted: false,
      });
      await expect(service.isNewUser('user1', 'org1')).resolves.toBe(true);
    });

    it('zwraca false gdy relacja istnieje i isTrusted=true', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({
        isTrusted: true,
      });
      await expect(service.isNewUser('user1', 'org1')).resolves.toBe(false);
    });
  });

  describe('isEligibleForOpenEnrollment()', () => {
    it('zwraca true gdy nie zbanowany i zaufany (isTrusted=true)', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({
        isBanned: false,
        isTrusted: true,
      });
      await expect(service.isEligibleForOpenEnrollment('user1', 'org1')).resolves.toBe(true);
    });

    it('zwraca false gdy zbanowany', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({
        isBanned: true,
        isTrusted: true,
      });
      await expect(service.isEligibleForOpenEnrollment('user1', 'org1')).resolves.toBe(false);
    });

    it('zwraca false gdy nowy użytkownik (nie zaufany)', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({
        isBanned: false,
        isTrusted: false,
      });
      await expect(service.isEligibleForOpenEnrollment('user1', 'org1')).resolves.toBe(false);
    });
  });

  describe('canAddGuests()', () => {
    it('zwraca true jeśli użytkownik nie jest nowy (zaufany)', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({ isTrusted: true });
      await expect(service.canAddGuests('user1', 'org1')).resolves.toBe(true);
    });

    it('zwraca false jeśli użytkownik jest nowy', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.canAddGuests('user1', 'org1')).resolves.toBe(false);
    });
  });

  describe('getGuestCount()', () => {
    it('zlicza enrollment z addedByUserId i wantsIn=true', async () => {
      (prisma.eventEnrollment.count as jest.Mock).mockResolvedValue(3);
      await expect(service.getGuestCount('event1', 'user1')).resolves.toBe(3);
      expect(prisma.eventEnrollment.count as jest.Mock).toHaveBeenCalledWith({
        where: { eventId: 'event1', addedByUserId: 'user1', wantsIn: true },
      });
    });

    it('zwraca 0 dla użytkownika bez gości', async () => {
      (prisma.eventEnrollment.count as jest.Mock).mockResolvedValue(0);
      await expect(service.getGuestCount('event1', 'user1')).resolves.toBe(0);
    });
  });
});
