import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env['FRONTEND_URL']?.split(',') ?? '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  handleConnection(_client: Socket) {
    // TODO: verify JWT from handshake
  }

  handleDisconnect(_client: Socket) {
    // cleanup
  }

  // ─── Group Chat ──────────────────────────────────────────────────────────────

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { eventId: string }) {
    client.join(`event-${data.eventId}`);
    return { event: 'joinedRoom', data: { eventId: data.eventId } };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { eventId: string }) {
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
}
