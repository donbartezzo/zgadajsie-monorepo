/**
 * Test integracyjny: ban/trust + eligibility
 * Wymaga działającej bazy testowej (docker-compose.test.yml, port 5434)
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/zgadajsie_test?schema=public';

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ModerationService } from '../modules/moderation/moderation.service';
import { EnrollmentEligibilityService } from '../modules/enrollment/enrollment-eligibility.service';
import { EmailService } from '../modules/notifications/email.service';
import { PushService } from '../modules/notifications/push.service';

const TEST_PREFIX = 'intmod_';

describe('[Integration] Moderation → Eligibility', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let moderationService: ModerationService;
  let eligibilityService: EnrollmentEligibilityService;

  let organizerId: string;
  let userId: string;

  const mockEmail = {
    sendReprimandNotification: jest.fn().mockResolvedValue(undefined),
    sendBanNotification: jest.fn().mockResolvedValue(undefined),
  };
  const mockPush = {
    notifyReprimand: jest.fn().mockResolvedValue(undefined),
    notifyBan: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        ModerationService,
        EnrollmentEligibilityService,
        { provide: EmailService, useValue: mockEmail },
        { provide: PushService, useValue: mockPush },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    moderationService = module.get(ModerationService);
    eligibilityService = module.get(EnrollmentEligibilityService);
    await module.init();
  });

  afterAll(async () => {
    await prisma.organizerUserRelation.deleteMany({
      where: { organizerUserId: { startsWith: TEST_PREFIX } },
    });
    await prisma.reprimand.deleteMany({ where: { fromUserId: { startsWith: TEST_PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
    await module.close();
  });

  beforeEach(async () => {
    const organizer = await prisma.user.create({
      data: {
        id: `${TEST_PREFIX}org_${Date.now()}`,
        email: `${TEST_PREFIX}org_${Date.now()}@test.pl`,
        displayName: 'Organizer',
        passwordHash: 'hash',
        isActive: true,
        isEmailVerified: true,
        role: 'USER',
      },
    });
    organizerId = organizer.id;

    const user = await prisma.user.create({
      data: {
        id: `${TEST_PREFIX}user_${Date.now()}`,
        email: `${TEST_PREFIX}user_${Date.now()}@test.pl`,
        displayName: 'Uczestnik',
        passwordHash: 'hash',
        isActive: true,
        isEmailVerified: true,
        role: 'USER',
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.organizerUserRelation.deleteMany({
      where: { OR: [{ organizerUserId: organizerId }, { targetUserId: userId }] },
    });
    await prisma.reprimand.deleteMany({
      where: { OR: [{ fromUserId: organizerId }, { toUserId: userId }] },
    });
    await prisma.user.deleteMany({ where: { id: { in: [organizerId, userId] } } });
  });

  describe('isBannedByOrganizer()', () => {
    it('nowy użytkownik nie jest zbanowany', async () => {
      const banned = await eligibilityService.isBannedByOrganizer(userId, organizerId);
      expect(banned).toBe(false);
    });

    it('po banie — isBannedByOrganizer() zwraca true', async () => {
      await moderationService.banUser(organizerId, { userId, reason: 'Test ban' });
      const banned = await eligibilityService.isBannedByOrganizer(userId, organizerId);
      expect(banned).toBe(true);
    });
  });

  describe('isNewUser()', () => {
    it('użytkownik bez relacji jest traktowany jako nowy', async () => {
      const isNew = await eligibilityService.isNewUser(userId, organizerId);
      expect(isNew).toBe(true);
    });

    it('po ustawieniu isTrusted=true — isNewUser() zwraca false', async () => {
      await prisma.organizerUserRelation.create({
        data: {
          organizerUserId: organizerId,
          targetUserId: userId,
          isTrusted: true,
          trustedAt: new Date(),
          isBanned: false,
        },
      });
      const isNew = await eligibilityService.isNewUser(userId, organizerId);
      expect(isNew).toBe(false);
    });
  });

  describe('isEligibleForOpenEnrollment()', () => {
    it('nowy użytkownik nie jest eligible (brak relacji zaufania)', async () => {
      const eligible = await eligibilityService.isEligibleForOpenEnrollment(userId, organizerId);
      expect(eligible).toBe(false);
    });

    it('trusted użytkownik jest eligible', async () => {
      await prisma.organizerUserRelation.create({
        data: {
          organizerUserId: organizerId,
          targetUserId: userId,
          isTrusted: true,
          trustedAt: new Date(),
          isBanned: false,
        },
      });
      const eligible = await eligibilityService.isEligibleForOpenEnrollment(userId, organizerId);
      expect(eligible).toBe(true);
    });

    it('zbanowany trusted użytkownik nie jest eligible', async () => {
      await prisma.organizerUserRelation.create({
        data: {
          organizerUserId: organizerId,
          targetUserId: userId,
          isTrusted: true,
          trustedAt: new Date(),
          isBanned: true,
          bannedAt: new Date(),
        },
      });
      const eligible = await eligibilityService.isEligibleForOpenEnrollment(userId, organizerId);
      expect(eligible).toBe(false);
    });
  });
});
