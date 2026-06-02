import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EmailService - sendTransactionalForNotification', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RESEND_API_KEY') return 'test-api-key';
              if (key === 'FRONTEND_URL') return 'https://test.com';
              if (key === 'EMAIL_FROM') return 'noreply@test.com';
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'RESEND_API_KEY') return 'test-api-key';
              if (key === 'FRONTEND_URL') return 'https://test.com';
              throw new Error(`Missing config: ${key}`);
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendTransactionalForNotification()', () => {
    it('EVENT_CANCELLED triggeruje sendEventCancelledEmail', async () => {
      const notification = {
        id: 'notif1',
        type: 'EVENT_CANCELLED',
        title: 'Event cancelled',
        body: 'Body',
        link: '/event',
        user: { email: 'test@example.com', displayName: 'Test User' },
        relatedEventId: 'event1',
      };

      jest.spyOn(service, 'sendEventCancelledEmail').mockResolvedValue(undefined);

      await service.sendTransactionalForNotification(notification);

      expect(service.sendEventCancelledEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'Event cancelled',
        '/event',
      );
    });

    it('PARTICIPATION_STATUS triggeruje sendParticipationStatusEmail', async () => {
      const notification = {
        id: 'notif1',
        type: 'PARTICIPATION_STATUS',
        title: 'Status update',
        body: 'SLOT_ASSIGNED',
        link: '/event',
        user: { email: 'test@example.com', displayName: 'Test User' },
        relatedEventId: 'event1',
      };

      jest.spyOn(service, 'sendParticipationStatusEmail').mockResolvedValue(undefined);

      await service.sendTransactionalForNotification(notification);

      expect(service.sendParticipationStatusEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'Status update',
        'SLOT_ASSIGNED',
        '/event',
      );
    });

    it('REPRIMAND triggeruje sendReprimandEmail', async () => {
      const notification = {
        id: 'notif1',
        type: 'REPRIMAND',
        title: 'Reprimand',
        body: 'Reason',
        link: '/event',
        user: { email: 'test@example.com', displayName: 'Test User' },
        relatedEventId: 'event1',
      };

      jest.spyOn(service, 'sendReprimandEmail').mockResolvedValue(undefined);

      await service.sendTransactionalForNotification(notification);

      expect(service.sendReprimandEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'Reprimand',
        'Reason',
        '/event',
      );
    });

    it('PAYMENT_CANCELLED loguje warn (nie zaimplementowane)', async () => {
      const notification = {
        id: 'notif1',
        type: 'PAYMENT_CANCELLED',
        title: 'Payment cancelled',
        body: 'Body',
        link: '/event',
        user: { email: 'test@example.com', displayName: 'Test User' },
        relatedEventId: 'event1',
      };

      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendTransactionalForNotification(notification);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('PAYMENT_CANCELLED email not implemented yet'),
      );
    });
  });
});
