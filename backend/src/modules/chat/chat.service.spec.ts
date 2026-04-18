import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

function buildPrismaMock() {
  return {
    event: {
      findUnique: jest.fn(),
    },
    eventEnrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    eventGroupMessage: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    privateChatMessage: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    eventSlot: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('ChatService', () => {
  let service: ChatService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ChatService(prisma as PrismaService);
    jest.clearAllMocks();
  });

  describe('hasEventAccess()', () => {
    it('organizator zawsze ma dostęp', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });

      const result = await service.hasEventAccess('event1', 'org1');

      expect(result).toBe(true);
      expect(prisma.eventEnrollment.findUnique as jest.Mock).not.toHaveBeenCalled();
    });

    it('uczestnik z wantsIn=true ma dostęp', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        wantsIn: true,
        withdrawnBy: null,
      });

      const result = await service.hasEventAccess('event1', 'user1');

      expect(result).toBe(true);
    });

    it('uczestnik wypisany dobrowolnie (withdrawnBy=USER) ma dostęp', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        wantsIn: false,
        withdrawnBy: 'USER',
      });

      const result = await service.hasEventAccess('event1', 'user1');

      expect(result).toBe(true);
    });

    it('uczestnik odrzucony przez organizatora (withdrawnBy=ORGANIZER) NIE ma dostępu', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        wantsIn: false,
        withdrawnBy: 'ORGANIZER',
      });

      const result = await service.hasEventAccess('event1', 'user1');

      expect(result).toBe(false);
    });

    it('użytkownik bez enrollment — brak dostępu', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.hasEventAccess('event1', 'user1');

      expect(result).toBe(false);
    });

    it('event nie istnieje — false', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.hasEventAccess('nonexistent', 'user1');

      expect(result).toBe(false);
    });
  });

  describe('createMessage() — dostęp grupowy', () => {
    it('tworzy wiadomość przez uczestnika z dostępem', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        wantsIn: true,
        withdrawnBy: null,
      });
      (prisma.eventGroupMessage.create as jest.Mock).mockResolvedValue({
        id: 'msg1',
        content: 'Hello!',
      });

      const result = await service.createMessage('event1', 'user1', 'Hello!');

      expect(prisma.eventGroupMessage.create as jest.Mock).toHaveBeenCalled();
      expect(result.id).toBe('msg1');
    });

    it('odmawia dostępu (ForbiddenException) uczestnikowi rejected', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        wantsIn: false,
        withdrawnBy: 'ORGANIZER',
      });

      await expect(service.createMessage('event1', 'user1', 'Hello!')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMessages()', () => {
    it('zwraca paginowane wiadomości z łączną liczbą', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventGroupMessage.findMany as jest.Mock).mockResolvedValue([
        { id: 'msg1', content: 'Hello', createdAt: new Date() },
      ]);
      (prisma.eventGroupMessage.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getMessages('event1', 'org1', 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('createSystemMessage()', () => {
    it('tworzy wiadomość bez sprawdzania dostępu (bypass dla systemu)', async () => {
      (prisma.eventGroupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys1' });

      await service.createSystemMessage('event1', 'system', 'System message');

      expect(prisma.eventGroupMessage.create as jest.Mock).toHaveBeenCalled();
      // No access check calls
      expect(prisma.eventEnrollment.findUnique as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('validatePrivateChatAccess() — przez createPrivateMessage', () => {
    it('self-message (userId === otherUserId): ForbiddenException', async () => {
      await expect(
        service.createPrivateMessage('event1', 'user1', 'user1', 'Hi'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('uczestnik → uczestnik: ForbiddenException (tylko org↔participant)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });

      await expect(
        service.createPrivateMessage('event1', 'user1', 'user2', 'Hi'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('organizator → uczestnik: OK', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        withdrawnBy: null,
      });
      (prisma.privateChatMessage.create as jest.Mock).mockResolvedValue({ id: 'pm1' });

      const result = await service.createPrivateMessage('event1', 'org1', 'user1', 'Hi');

      expect(result.id).toBe('pm1');
    });

    it('rejected uczestnik → organizator: ForbiddenException', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        wantsIn: false,
        withdrawnBy: 'ORGANIZER',
      });

      await expect(
        service.createPrivateMessage('event1', 'user1', 'org1', 'Hi'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('uczestnik → organizator: OK', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });
      (prisma.eventEnrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        wantsIn: true,
        withdrawnBy: null,
      });
      (prisma.privateChatMessage.create as jest.Mock).mockResolvedValue({ id: 'pm2' });

      const result = await service.createPrivateMessage('event1', 'user1', 'org1', 'Hi organizer');

      expect(result.id).toBe('pm2');
    });
  });

  describe('getOrganizerConversations()', () => {
    it('odmawia nie-organizatorowi (ForbiddenException)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event1',
        organizerId: 'org1',
      });

      await expect(
        service.getOrganizerConversations('event1', 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('zwraca listę konwersacji organizatora', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({ organizerId: 'org1' });
      (prisma.privateChatMessage.findMany as jest.Mock).mockResolvedValue([
        { senderId: 'user1', recipientId: 'org1' },
      ]);
      (prisma.user as any).findMany.mockResolvedValue([
        { id: 'user1', displayName: 'User 1', avatarUrl: null },
      ]);
      (prisma.privateChatMessage.findFirst as jest.Mock).mockResolvedValue({
        content: 'Hello',
        createdAt: new Date(),
        senderId: 'user1',
      });
      (prisma.privateChatMessage.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrganizerConversations('event1', 'org1');

      expect(result).toHaveLength(1);
      expect(result[0].participant.id).toBe('user1');
    });

    it('zwraca [] gdy brak konwersacji', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({ organizerId: 'org1' });
      (prisma.privateChatMessage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getOrganizerConversations('event1', 'org1');

      expect(result).toEqual([]);
    });
  });

  describe('getChatMembers()', () => {
    it('zwraca organizatora i listę członków z statusami', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        organizerId: 'org1',
        organizer: { id: 'org1', displayName: 'Organizer', avatarUrl: null },
      });
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          userId: 'user1',
          wantsIn: true,
          withdrawnBy: null,
          slot: { confirmed: true },
          user: { id: 'user1', displayName: 'User 1', avatarUrl: null },
        },
      ]);

      const result = await service.getChatMembers('event1');

      expect(result.organizer.id).toBe('org1');
      expect(result.organizer.isOrganizer).toBe(true);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].status).toBe('CONFIRMED');
    });

    it('wypisany uczestnik ma isActive=false i status=WITHDRAWN', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        organizerId: 'org1',
        organizer: { id: 'org1', displayName: 'Organizer', avatarUrl: null },
      });
      (prisma.eventEnrollment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          userId: 'user1',
          wantsIn: false,
          withdrawnBy: 'USER',
          slot: null,
          user: { id: 'user1', displayName: 'User 1', avatarUrl: null },
        },
      ]);

      const result = await service.getChatMembers('event1');

      expect(result.members[0].isActive).toBe(false);
      expect(result.members[0].status).toBe('WITHDRAWN');
    });

    it('rzuca NotFoundException gdy event nie istnieje', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getChatMembers('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
