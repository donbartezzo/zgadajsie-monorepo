import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { PushService } from '../notifications/push.service';
import { ModerationService } from './moderation.service';

function buildPrismaMock() {
  return {
    reprimand: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    organizerUserRelation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    eventEnrollment: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    eventSlot: {
      update: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;
}

function buildEmailMock() {
  return {
    sendReprimandEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailService;
}

function buildPushMock() {
  return {
    notifyReprimand: jest.fn().mockResolvedValue(undefined),
  } as unknown as PushService;
}

const baseReprimand = {
  id: 'rep1',
  fromUserId: 'org1',
  toUserId: 'user1',
  eventId: null,
  reason: 'Spam',
  type: 'REPRIMAND',
  expiresAt: null,
  createdAt: new Date(),
};

describe('ModerationService', () => {
  let service: ModerationService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let email: ReturnType<typeof buildEmailMock>;
  let push: ReturnType<typeof buildPushMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    email = buildEmailMock();
    push = buildPushMock();
    service = new ModerationService(
      prisma as PrismaService,
      email as EmailService,
      push as PushService,
    );
    jest.clearAllMocks();
  });

  describe('createReprimand()', () => {
    it('tworzy reprymendę z opisem i metadanymi', async () => {
      (prisma.reprimand.create as jest.Mock).mockResolvedValue(baseReprimand);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.createReprimand('org1', {
        toUserId: 'user1',
        reason: 'Spam',
      });

      expect(prisma.reprimand.create as jest.Mock).toHaveBeenCalled();
      expect(result.id).toBe('rep1');
    });

    it('wysyła powiadomienie push do reprymenowanego', async () => {
      (prisma.reprimand.create as jest.Mock).mockResolvedValue(baseReprimand);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
        displayName: 'User',
      });

      await service.createReprimand('org1', { toUserId: 'user1', reason: 'Spam' });

      expect(push.notifyReprimand as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('banUser()', () => {
    it('tworzy ban użytkownika przez organizatora', async () => {
      (prisma.reprimand.create as jest.Mock).mockResolvedValue({});
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.banUser('org1', { userId: 'user1', reason: 'Spam' });

      expect(prisma.reprimand.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'BAN' }) }),
      );
      expect(result.success).toBe(true);
    });

    it('ustawia isBanned=true i isTrusted=false w relacji', async () => {
      (prisma.reprimand.create as jest.Mock).mockResolvedValue({});
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([]);

      await service.banUser('org1', { userId: 'user1', reason: 'Spam' });

      const upsertCall = (prisma.organizerUserRelation.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.isBanned).toBe(true);
      expect(upsertCall.update.isTrusted).toBe(false);
    });

    it('zwalnia sloty bananowanego uczestnika z aktywnych eventów', async () => {
      (prisma.reprimand.create as jest.Mock).mockResolvedValue({});
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          slot: { id: 'slot1' },
        },
      ]);
      (prisma.eventSlot.update as jest.Mock).mockResolvedValue({});
      (prisma.eventEnrollment.update as jest.Mock).mockResolvedValue({});

      await service.banUser('org1', { userId: 'user1', reason: 'Spam' });

      expect(prisma.eventSlot.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'slot1' },
        data: { enrollmentId: null, assignedAt: null, confirmed: false },
      });
    });
  });

  describe('unbanUser()', () => {
    it('usuwa ban użytkownika', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({
        id: 'rel1',
        isBanned: true,
      });
      (prisma.organizerUserRelation.update as jest.Mock).mockResolvedValue({});
      (prisma.eventEnrollment.updateMany as jest.Mock).mockResolvedValue({});

      const result = await service.unbanUser('org1', 'user1');

      expect(prisma.organizerUserRelation.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'rel1' },
        data: { isBanned: false, bannedAt: null },
      });
      expect(result.success).toBe(true);
    });

    it('rzuca NotFoundException jeśli relacja nie istnieje', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.unbanUser('org1', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('trustUser()', () => {
    it('oznacza użytkownika jako zaufanego', async () => {
      (prisma.organizerUserRelation.upsert as jest.Mock).mockResolvedValue({});

      await service.trustUser('org1', 'user1');

      const upsertCall = (prisma.organizerUserRelation.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.isTrusted).toBe(true);
      expect(upsertCall.update.isTrusted).toBe(true);
    });
  });

  describe('untrustUser()', () => {
    it('usuwa oznaczenie zaufania', async () => {
      (prisma.organizerUserRelation.findUnique as jest.Mock).mockResolvedValue({ id: 'rel1' });
      (prisma.organizerUserRelation.update as jest.Mock).mockResolvedValue({});

      await service.untrustUser('org1', 'user1');

      expect(prisma.organizerUserRelation.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'rel1' },
        data: { isTrusted: false, trustedAt: null },
      });
    });
  });
});
