import { Test, TestingModule } from '@nestjs/testing';
import { NotificationKind } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationContext } from './notification-policy';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
  });

  describe('create() - debounce logic', () => {
    it('tworzy nową notyfikację gdy brak unread w oknie debounce', async () => {
      const ctx: NotificationContext = { userId: 'user1', relatedEventId: 'event1' };
      const title = 'Test notification';
      const body = 'Test body';
      const link = '/test';

      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({
        id: 'notif1',
        userId: 'user1',
        type: NotificationKind.NEW_APPLICATION,
        title,
        body,
        link,
        groupKey: null,
        aggregateCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        readAt: null,
        relevanceUntil: null,
        deleteAfter: new Date(),
        relatedEventId: 'event1',
      });

      const result = await service.create(ctx, NotificationKind.NEW_APPLICATION, title, body, link);

      expect(result.wasUpdate).toBe(false);
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('debounce: 3× notifyUser z tym samym groupKey w 5 min → 1 rekord, aggregateCount = 3', async () => {
      const ctx: NotificationContext = { userId: 'user1', relatedEventId: 'event1' };
      const title = 'New message';
      const body = 'You have a new message';
      const link = '/chat';

      // Pierwsze wywołanie - brak istniejącej
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({
        id: 'notif1',
        userId: 'user1',
        type: NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
        groupKey: 'pm:event1:sender1',
        aggregateCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        readAt: null,
        relevanceUntil: null,
        deleteAfter: new Date(),
        relatedEventId: 'event1',
      });

      const result1 = await service.create(
        ctx,
        NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
      );
      expect(result1.wasUpdate).toBe(false);
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);

      // Drugie wywołanie - istnieje unread w oknie
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif1',
        userId: 'user1',
        type: NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
        groupKey: 'pm:event1:sender1',
        aggregateCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        readAt: null,
        relevanceUntil: null,
        deleteAfter: new Date(),
        relatedEventId: 'event1',
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif1',
        userId: 'user1',
        type: NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
        groupKey: 'pm:event1:sender1',
        aggregateCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        readAt: null,
        relevanceUntil: null,
        deleteAfter: new Date(),
        relatedEventId: 'event1',
      });

      const result2 = await service.create(
        ctx,
        NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
      );
      expect(result2.wasUpdate).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        data: expect.objectContaining({
          aggregateCount: { increment: 1 },
          pushSentAt: null,
          emailSentAt: null,
        }),
      });

      // Trzecie wywołanie - update z aggregateCount = 3
      prisma.notification.update.mockResolvedValue({
        id: 'notif1',
        userId: 'user1',
        type: NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
        groupKey: 'pm:event1:sender1',
        aggregateCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        readAt: null,
        relevanceUntil: null,
        deleteAfter: new Date(),
        relatedEventId: 'event1',
        pushSentAt: null,
        emailSentAt: null,
      });

      const result3 = await service.create(
        ctx,
        NotificationKind.NEW_CHAT_MESSAGE,
        title,
        body,
        link,
      );
      expect(result3.wasUpdate).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledTimes(2);
      expect((result3.notification as any).aggregateCount).toBe(3);
    });
  });

  describe('markByGroupKey()', () => {
    it('markByGroupKey: 2 unread w grupie → po wywołaniu obie mają readAt', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });

      await service.markByGroupKey('user1', 'pm:event1:sender1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          groupKey: 'pm:event1:sender1',
          readAt: null,
        },
        data: expect.objectContaining({
          readAt: expect.any(Date),
          deleteAfter: expect.any(Date),
        }),
      });
    });
  });

  describe('markAsRead() - retencja', () => {
    it('markAsRead na unread → deleteAfter ustawione na readAt + 7d', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('notif1', 'user1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif1', userId: 'user1', readAt: null },
        data: expect.objectContaining({
          readAt: expect.any(Date),
          deleteAfter: expect.any(Date),
        }),
      });
    });
  });
});
