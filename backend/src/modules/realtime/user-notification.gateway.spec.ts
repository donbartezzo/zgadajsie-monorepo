import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserNotificationGateway } from './user-notification.gateway';

function buildJwtMock() {
  return {
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
}

describe('UserNotificationGateway', () => {
  let gateway: UserNotificationGateway;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = buildJwtMock();
    gateway = new UserNotificationGateway(jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should join user room when JWT is valid', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockClient = {
        id: 'client-1',
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        handshake: { auth: { token: 'valid-token' }, headers: {} },
      } as any;

      const mockPayload = { sub: 'user-123' };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      await gateway.handleConnection(mockClient);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(mockClient.join).toHaveBeenCalledWith('user:user-123');
    });

    it('should disconnect when JWT is invalid', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockClient = {
        id: 'client-1',
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        handshake: { auth: { token: 'bad-token' }, headers: {} },
      } as any;

      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      await gateway.handleConnection(mockClient);

      expect(jwtService.verifyAsync).toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect when JWT is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockClient = {
        id: 'client-1',
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        handshake: { auth: {}, headers: {} },
      } as any;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect without errors', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockClient = {
        id: 'client-1',
        leave: jest.fn(),
      } as any;

      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('emitToUser', () => {
    it('should emit notification to user room', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as any;

      gateway['server'] = mockServer;

      const payload = {
        id: 'notif-1',
        type: 'NEW_APPLICATION',
        title: 'Test',
        body: 'Test body',
        createdAt: new Date().toISOString(),
      };

      gateway.emitToUser('user-123', payload);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', payload);
    });
  });
});
