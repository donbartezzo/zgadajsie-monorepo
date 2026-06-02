import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEmailDigestCron } from './notification-email-digest.cron';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { NotificationKind } from '@prisma/client';
import { subtractMinutes } from '@zgadajsie/shared';

describe('NotificationEmailDigestCron', () => {
  let cron: NotificationEmailDigestCron;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEmailDigestCron,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          provide: EmailService,
          useValue: {
            sendDigest: jest.fn(),
          },
        },
      ],
    }).compile();

    cron = module.get<NotificationEmailDigestCron>(NotificationEmailDigestCron);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  describe('run()', () => {
    it('user z 3 unread > 1h dostaje 1 email', async () => {
      const cutoff = subtractMinutes(new Date(), 61);
      const items = [
        {
          id: 'notif1',
          userId: 'user1',
          type: NotificationKind.NEW_APPLICATION,
          title: 'Test 1',
          body: 'Body 1',
          link: '/test1',
          groupKey: null,
          aggregateCount: 1,
          createdAt: cutoff,
          updatedAt: cutoff,
          readAt: null,
          relevanceUntil: null,
          deleteAfter: new Date(),
          relatedEventId: 'event1',
          pushSentAt: null,
          emailSentAt: null,
        },
        {
          id: 'notif2',
          userId: 'user1',
          type: NotificationKind.NEW_APPLICATION,
          title: 'Test 2',
          body: 'Body 2',
          link: '/test2',
          groupKey: null,
          aggregateCount: 1,
          createdAt: cutoff,
          updatedAt: cutoff,
          readAt: null,
          relevanceUntil: null,
          deleteAfter: new Date(),
          relatedEventId: 'event2',
          pushSentAt: null,
          emailSentAt: null,
        },
        {
          id: 'notif3',
          userId: 'user1',
          type: NotificationKind.NEW_APPLICATION,
          title: 'Test 3',
          body: 'Body 3',
          link: '/test3',
          groupKey: null,
          aggregateCount: 1,
          createdAt: cutoff,
          updatedAt: cutoff,
          readAt: null,
          relevanceUntil: null,
          deleteAfter: new Date(),
          relatedEventId: 'event3',
          pushSentAt: null,
          emailSentAt: null,
        },
      ];

      prisma.$queryRaw.mockResolvedValue([{ userId: 'user1' }]);
      prisma.notification.findMany.mockResolvedValue(items);
      emailService.sendDigest.mockResolvedValue(undefined);
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await cron.run();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          readAt: null,
          emailSentAt: null,
          type: { in: expect.any(Array) },
          updatedAt: { lt: expect.any(Date) },
          OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: expect.any(Date) } }],
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      expect(emailService.sendDigest).toHaveBeenCalledWith('user1', items);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['notif1', 'notif2', 'notif3'] } },
        data: { emailSentAt: expect.any(Date) },
      });
    });

    it('pomija usera bez unread notyfikacji', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await cron.run();

      expect(emailService.sendDigest).not.toHaveBeenCalled();
      expect(prisma.notification.findMany).not.toHaveBeenCalled();
    });

    it('pomija notyfikacje już z emailSentAt', async () => {
      prisma.$queryRaw.mockResolvedValue([{ userId: 'user1' }]);
      prisma.notification.findMany.mockResolvedValue([]);

      await cron.run();

      expect(emailService.sendDigest).not.toHaveBeenCalled();
    });
  });
});
