import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { UserNotificationGateway } from '../realtime/user-notification.gateway';
import { NotificationKind } from '@prisma/client';

function buildPrismaMock() {
  return {
    user: { findUnique: jest.fn() },
    event: { findUnique: jest.fn() },
  } as unknown as PrismaService;
}

function buildNotificationsMock() {
  return {
    create: jest.fn(),
  } as unknown as NotificationsService;
}

function buildGatewayMock() {
  return {
    emitToUser: jest.fn(),
  } as unknown as UserNotificationGateway;
}

describe('PushService', () => {
  let service: PushService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;
  let gateway: UserNotificationGateway;

  beforeEach(() => {
    prisma = buildPrismaMock();
    notificationsService = buildNotificationsMock();
    gateway = buildGatewayMock();
    service = new PushService(prisma, notificationsService, gateway);
  });

  afterEach(() => jest.clearAllMocks());

  describe('notifyUser()', () => {
    it('pomija notyfikację dla FAKE users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ accountType: 'FAKE' });

      await service.notifyUser({ userId: 'user-1' }, NotificationKind.NEW_APPLICATION, 'T', 'B');

      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    });

    it('pomija notyfikację gdy user nie istnieje', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.notifyUser({ userId: 'user-1' }, NotificationKind.NEW_APPLICATION, 'T', 'B');

      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    });

    it('wywołuje create i emituje WS z prawidłowym payload', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const mockNotification = { id: 'notif-1', aggregateCount: 1, createdAt };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ accountType: 'REAL' });
      (notificationsService.create as jest.Mock).mockResolvedValue({
        notification: mockNotification,
        wasUpdate: false,
      });

      await service.notifyUser(
        { userId: 'user-1', relatedEventId: 'event-1' },
        NotificationKind.NEW_APPLICATION,
        'Test Title',
        'Test Body',
        '/w/city/event-1',
      );

      expect(notificationsService.create).toHaveBeenCalledWith(
        { userId: 'user-1', relatedEventId: 'event-1' },
        NotificationKind.NEW_APPLICATION,
        'Test Title',
        'Test Body',
        '/w/city/event-1',
        undefined,
      );

      expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', {
        id: 'notif-1',
        type: NotificationKind.NEW_APPLICATION,
        title: 'Test Title',
        body: 'Test Body',
        link: '/w/city/event-1',
        aggregateCount: 1,
        wasUpdate: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('emituje wasUpdate: true przy debounce update', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const mockNotification = { id: 'notif-1', aggregateCount: 2, createdAt };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ accountType: 'REAL' });
      (notificationsService.create as jest.Mock).mockResolvedValue({
        notification: mockNotification,
        wasUpdate: true,
      });

      await service.notifyUser({ userId: 'user-1' }, NotificationKind.NEW_CHAT_MESSAGE, 'T', 'B');

      expect(gateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ wasUpdate: true, aggregateCount: 2 }),
      );
    });
  });
});
