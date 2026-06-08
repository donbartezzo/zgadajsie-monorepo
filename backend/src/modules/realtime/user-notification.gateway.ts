import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  relatedEventId?: string;
  aggregateCount?: number;
  wasUpdate?: boolean;
  createdAt: string;
}

@WebSocketGateway({
  namespace: '/user-notifications',
  cors: { origin: process.env['FRONTEND_URL']?.split(',') ?? '*', credentials: true },
})
export class UserNotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(UserNotificationGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        this.logger.warn('Connection rejected: no token provided');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('Connection rejected: invalid token payload');
        client.disconnect();
        return;
      }

      const roomName = this.getUserRoomName(userId);
      client.join(roomName);
      this.logger.log(`User ${userId} connected to room ${roomName}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.warn(`Connection rejected: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    // Socket.IO cleans up rooms automatically on disconnect
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, payload: NotificationPayload): void {
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot emit notification');
      return;
    }

    const roomName = this.getUserRoomName(userId);
    this.server.to(roomName).emit('notification', payload);
    this.logger.log(`Notification emitted to user ${userId} in room ${roomName}`);
  }

  /** Autorytatywny licznik nieprzeczytanych — emitowany po każdej mutacji notyfikacji. */
  emitUnreadCount(userId: string, count: number): void {
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot emit unread count');
      return;
    }

    this.server.to(this.getUserRoomName(userId)).emit('unread-count', { count });
  }

  private getUserRoomName(userId: string): string {
    return `user:${userId}`;
  }
}
