import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEscalationCron } from './notification-escalation.cron';
import { PrismaService } from '../prisma/prisma.service';
import { PushDeliveryService } from './push-delivery.service';
import { EmailService } from './email.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';
import { NotificationKind } from '@prisma/client';
import { subtractMinutes } from '@zgadajsie/shared';

const buildNotification = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'notif1',
  userId: 'user1',
  type: NotificationKind.NEW_APPLICATION,
  title: 'Test',
  body: 'Test body',
  link: '/test',
  groupKey: null,
  aggregateCount: 1,
  createdAt: subtractMinutes(new Date(), 6),
  updatedAt: subtractMinutes(new Date(), 6),
  readAt: null,
  relevanceUntil: null,
  deleteAfter: new Date(),
  relatedEventId: 'event1',
  pushSentAt: null,
  emailSentAt: null,
  user: { displayName: 'Test User', realDetails: { email: 'user@example.com' } },
  ...overrides,
});

describe('NotificationEscalationCron', () => {
  let cron: NotificationEscalationCron;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let pushDelivery: jest.Mocked<PushDeliveryService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEscalationCron,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          provide: PushDeliveryService,
          useValue: { sendWebPush: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendTransactionalForNotification: jest.fn() },
        },
        {
          provide: CronAdminService,
          useValue: {
            registerTrigger: jest.fn(),
            recordRun: jest.fn(),
            recordRunToDb: jest.fn(),
          },
        },
      ],
    }).compile();

    cron = module.get<NotificationEscalationCron>(NotificationEscalationCron);
    prisma = module.get(PrismaService);
    pushDelivery = module.get(PushDeliveryService);
    emailService = module.get(EmailService);
  });

  describe('run() — escalatePush', () => {
    it('wysyła push dla rekordu starszego niż 5 min, unread, bez pushSentAt', async () => {
      const notification = buildNotification();

      prisma.notification.findMany
        .mockResolvedValueOnce([notification]) // escalatePush
        .mockResolvedValueOnce([]); // escalateTransactionalEmail
      pushDelivery.sendWebPush.mockResolvedValue(undefined);
      prisma.notification.update.mockResolvedValue(notification);

      await cron.run();

      expect(pushDelivery.sendWebPush).toHaveBeenCalledWith(notification);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        data: { pushSentAt: expect.any(Date) },
      });
    });

    it('pomija rekord przeczytany (readAt != null)', async () => {
      prisma.notification.findMany
        .mockResolvedValueOnce([]) // escalatePush — query filtruje readAt: null
        .mockResolvedValueOnce([]);

      await cron.run();

      expect(pushDelivery.sendWebPush).not.toHaveBeenCalled();
    });

    it('pomija rekord z pushSentAt już ustawionym', async () => {
      prisma.notification.findMany
        .mockResolvedValueOnce([]) // query filtruje pushSentAt: null
        .mockResolvedValueOnce([]);

      await cron.run();

      expect(pushDelivery.sendWebPush).not.toHaveBeenCalled();
    });

    it('ustawia prawidłowe warunki zapytania dla push', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await cron.run();

      expect(prisma.notification.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          readAt: null,
          pushSentAt: null,
          updatedAt: { lte: expect.any(Date) },
          OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: expect.any(Date) } }],
        },
        take: 100,
      });
    });
  });

  describe('run() — escalateTransactionalEmail', () => {
    it('wysyła email transactional dla rekordu TRANSACTIONAL starszego niż 60 min', async () => {
      const notification = buildNotification({
        type: NotificationKind.EVENT_CANCELLED,
        createdAt: subtractMinutes(new Date(), 61),
        updatedAt: subtractMinutes(new Date(), 61),
      });

      prisma.notification.findMany
        .mockResolvedValueOnce([]) // escalatePush
        .mockResolvedValueOnce([notification]); // escalateTransactionalEmail
      emailService.sendTransactionalForNotification.mockResolvedValue(undefined);
      prisma.notification.update.mockResolvedValue(notification);

      await cron.run();

      expect(emailService.sendTransactionalForNotification).toHaveBeenCalledWith({
        ...notification,
        user: { email: 'user@example.com', displayName: 'Test User' },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        data: { emailSentAt: expect.any(Date) },
      });
    });

    it('pomija notyfikację z emailMode != TRANSACTIONAL (np. NEW_APPLICATION = DIGEST)', async () => {
      const notification = buildNotification({
        type: NotificationKind.NEW_APPLICATION, // emailMode = DIGEST
        createdAt: subtractMinutes(new Date(), 61),
      });

      prisma.notification.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([notification]);

      await cron.run();

      expect(emailService.sendTransactionalForNotification).not.toHaveBeenCalled();
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('ustawia prawidłowe warunki zapytania dla email (z include user)', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await cron.run();

      expect(prisma.notification.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          readAt: null,
          emailSentAt: null,
          updatedAt: { lte: expect.any(Date) },
          OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: expect.any(Date) } }],
        },
        include: {
          user: { select: { displayName: true, realDetails: { select: { email: true } } } },
        },
        take: 100,
      });
    });
  });
});
