import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrganizerDigestCron } from './organizer-digest.cron';
import { OrganizerService } from './organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const FRONTEND_URL = 'https://app.example.com';

function makeEmptyDigest() {
  return {
    period: { from: new Date().toISOString(), to: new Date().toISOString() },
    pendingConfirmations: [],
    recentlyCreated: [],
    recentlyEnded: [],
    upcoming: [],
    recentlyCancelled: [],
    activeSeries: [],
    recentlyDeactivatedSeries: [],
  };
}

function makeDigestWithContent() {
  return {
    ...makeEmptyDigest(),
    upcoming: [
      {
        id: 'event-1',
        title: 'Trening',
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        status: 'ACTIVE',
        enrollmentCount: 3,
        seriesId: null,
        seriesName: null,
        confirmToken: null,
      },
    ],
  };
}

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
};

const mockOrganizerService = {
  getDigestData: jest.fn(),
};

const mockEmailService = {
  sendOrganizerWeeklyDigest: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue(FRONTEND_URL),
};

const mockCronAdmin = {
  registerTrigger: jest.fn(),
  recordRun: jest.fn(),
};

describe('OrganizerDigestCron', () => {
  let cron: OrganizerDigestCron;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizerDigestCron,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrganizerService, useValue: mockOrganizerService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CronAdminService, useValue: mockCronAdmin },
      ],
    }).compile();

    cron = module.get(OrganizerDigestCron);
  });

  describe('handleWeeklyDigestBatch', () => {
    it('nie przetwarza nic gdy brak organizatorów do wysłania', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await cron.handleWeeklyDigestBatch();

      expect(mockEmailService.sendOrganizerWeeklyDigest).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('wysyła digest i aktualizuje weeklyDigestSentAt dla znalezionych organizatorów', async () => {
      const organizer = { id: 'user-1', email: 'org@test.com', displayName: 'Jan Kowalski' };
      mockPrisma.user.findMany.mockResolvedValue([organizer]);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(organizer);
      mockOrganizerService.getDigestData.mockResolvedValue(makeDigestWithContent());

      await cron.handleWeeklyDigestBatch();

      expect(mockEmailService.sendOrganizerWeeklyDigest).toHaveBeenCalledWith(
        organizer.email,
        organizer.displayName,
        expect.objectContaining({ upcoming: expect.any(Array) }),
        FRONTEND_URL,
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: organizer.id },
          data: { weeklyDigestSentAt: expect.any(Date) },
        }),
      );
    });

    it('nie wysyła e-maila gdy digest jest pusty, ale aktualizuje weeklyDigestSentAt', async () => {
      const organizer = { id: 'user-2', email: 'empty@test.com', displayName: 'Pusta' };
      mockPrisma.user.findMany.mockResolvedValue([organizer]);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(organizer);
      mockOrganizerService.getDigestData.mockResolvedValue(makeEmptyDigest());

      await cron.handleWeeklyDigestBatch();

      expect(mockEmailService.sendOrganizerWeeklyDigest).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: organizer.id } }),
      );
    });

    it('błąd u jednego organizatora nie blokuje pozostałych', async () => {
      const org1 = { id: 'user-1', email: 'org1@test.com', displayName: 'Org 1' };
      const org2 = { id: 'user-2', email: 'org2@test.com', displayName: 'Org 2' };
      mockPrisma.user.findMany.mockResolvedValue([org1, org2]);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(org1).mockResolvedValueOnce(org2);
      mockOrganizerService.getDigestData
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(makeDigestWithContent());

      await cron.handleWeeklyDigestBatch();

      expect(mockEmailService.sendOrganizerWeeklyDigest).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendOrganizerWeeklyDigest).toHaveBeenCalledWith(
        org2.email,
        expect.any(String),
        expect.any(Object),
        FRONTEND_URL,
      );
    });
  });

  describe('sendDigestForUser', () => {
    it('wysyła e-mail gdy digest ma zawartość', async () => {
      const user = { id: 'user-1', email: 'org@test.com', displayName: 'Org' };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockOrganizerService.getDigestData.mockResolvedValue(makeDigestWithContent());

      await cron.sendDigestForUser('user-1');

      expect(mockEmailService.sendOrganizerWeeklyDigest).toHaveBeenCalledTimes(1);
    });
  });
});
