import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatNotificationService } from './chat-notification.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env['FRONTEND_URL']?.split(',') ?? '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private chatNotificationService: ChatNotificationService,
  ) {}

  handleConnection(_client: Socket) {
    // TODO: verify JWT from handshake
  }

  handleDisconnect(_client: Socket) {
    // cleanup
  }

  // ─── Group Chat ──────────────────────────────────────────────────────────────

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      const hasAccess = await this.chatService.hasEventAccess(data.eventId, userId);
      if (!hasAccess) {
        client.emit('errorMessage', {
          type: 'joinRoom',
          message: 'Brak dostępu do czatu grupowego',
        });
        return;
      }
      client.join(`user-in-event:${data.eventId}:${userId}`);
    }

    client.join(`event-${data.eventId}`);
    return { event: 'joinedRoom', data: { eventId: data.eventId } };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { eventId: string }) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      client.leave(`user-in-event:${data.eventId}:${userId}`);
    }
    client.leave(`event-${data.eventId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string; userId: string; content: string },
  ) {
    try {
      const message = await this.chatService.createMessage(data.eventId, data.userId, data.content);
      this.server.to(`event-${data.eventId}`).emit('newMessage', message);

      const room = `event-${data.eventId}`;
      const activeUserIds = new Set<string>();
      const sockets = await this.server.in(room).fetchSockets();
      for (const socket of sockets) {
        if (socket.handshake.auth?.userId) {
          activeUserIds.add(socket.handshake.auth.userId);
        }
      }

      setImmediate(() => {
        this.chatNotificationService
          .onNewGroupMessage(data.eventId, data.userId, message, activeUserIds)
          .catch((err) =>
            this.logger.error(`Failed to send group chat notification: ${err.message}`),
          );
      });
      return message;
    } catch (error: unknown) {
      const err = error as { message?: string };
      client.emit('errorMessage', {
        type: 'sendMessage',
        message: err.message || 'Nie udało się wysłać wiadomości',
      });
      return { error: err.message || 'Nie udało się wysłać wiadomości' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string; userId: string; displayName: string },
  ) {
    client.to(`event-${data.eventId}`).emit('userTyping', {
      userId: data.userId,
      displayName: data.displayName,
    });
  }

  // ─── Private Chat (Organizer ↔ Participant) ────────────────────────────────

  @SubscribeMessage('joinPrivateRoom')
  handleJoinPrivateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string; otherUserId: string },
  ) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      client.join(`user-in-private:${data.eventId}:${userId}`);
    }
    const room = this.getPrivateRoomName(
      data.eventId,
      client.handshake.auth?.userId,
      data.otherUserId,
    );
    client.join(room);
    return {
      event: 'joinedPrivateRoom',
      data: { eventId: data.eventId, otherUserId: data.otherUserId },
    };
  }

  @SubscribeMessage('leavePrivateRoom')
  handleLeavePrivateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string; otherUserId: string },
  ) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      client.leave(`user-in-private:${data.eventId}:${userId}`);
    }
    const room = this.getPrivateRoomName(
      data.eventId,
      client.handshake.auth?.userId,
      data.otherUserId,
    );
    client.leave(room);
  }

  @SubscribeMessage('sendPrivateMessage')
  async handleSendPrivateMessage(
    @ConnectedSocket() _client: Socket,
    @MessageBody()
    data: { eventId: string; senderId: string; recipientId: string; content: string },
  ) {
    const message = await this.chatService.createPrivateMessage(
      data.eventId,
      data.senderId,
      data.recipientId,
      data.content,
    );
    const room = this.getPrivateRoomName(data.eventId, data.senderId, data.recipientId);
    this.server.to(room).emit('newPrivateMessage', message);

    // Skip notification when recipient is actively viewing this conversation —
    // they already see the message live via 'newPrivateMessage'.
    const sockets = await this.server.in(room).fetchSockets();
    const recipientActive = sockets.some(
      (socket) => socket.handshake.auth?.userId === data.recipientId,
    );

    setImmediate(() => {
      this.chatNotificationService
        .onNewPrivateMessage(data.eventId, data.senderId, data.recipientId, recipientActive)
        .catch((err) => this.logger.error(`Failed to send notification: ${err.message}`));
    });

    // Emit unread count update to both organizer and recipient if they are actively viewing the event page
    const organizerId = await this.chatService.getEventOrganizerId(data.eventId);

    // Emit to organizer
    if (organizerId && (data.senderId === organizerId || data.recipientId === organizerId)) {
      const otherUserId = data.senderId === organizerId ? data.recipientId : data.senderId;
      const unreadCount = await this.chatService.getUnreadCount(
        data.eventId,
        organizerId,
        otherUserId,
      );

      const organizerRoom = `user-in-event:${data.eventId}:${organizerId}`;
      this.server.to(organizerRoom).emit('unreadCountUpdated', {
        eventId: data.eventId,
        userId: otherUserId,
        unreadCount,
      });
    }

    // Emit to recipient (if not organizer)
    if (organizerId && data.recipientId !== organizerId) {
      const unreadCount = await this.chatService.getUnreadCount(
        data.eventId,
        data.recipientId,
        data.senderId,
      );

      const recipientRoom = `user-in-event:${data.eventId}:${data.recipientId}`;
      this.server.to(recipientRoom).emit('unreadCountUpdated', {
        eventId: data.eventId,
        userId: data.senderId,
        unreadCount,
      });
    }

    return message;
  }

  @SubscribeMessage('privateTyping')
  handlePrivateTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { eventId: string; userId: string; otherUserId: string; displayName: string },
  ) {
    const room = this.getPrivateRoomName(data.eventId, data.userId, data.otherUserId);
    client.to(room).emit('privateUserTyping', {
      userId: data.userId,
      displayName: data.displayName,
    });
  }

  private getPrivateRoomName(eventId: string, userA: string, userB: string): string {
    const [first, second] = [userA, userB].sort();
    return `private-${eventId}-${first}-${second}`;
  }

  isUserInGroupChat(eventId: string, userId: string): boolean {
    const room = `user-in-event:${eventId}:${userId}`;
    return (this.server.sockets.adapter.rooms.get(room)?.size ?? 0) > 0;
  }

  isUserInPrivateChat(eventId: string, userId: string): boolean {
    const room = `user-in-private:${eventId}:${userId}`;
    return (this.server.sockets.adapter.rooms.get(room)?.size ?? 0) > 0;
  }
}
