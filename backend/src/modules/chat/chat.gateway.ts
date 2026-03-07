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
import { DirectMessagesService } from '../direct-messages/direct-messages.service';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private directMessagesService: DirectMessagesService,
  ) {}

  handleConnection(_client: Socket) {
    // TODO: verify JWT from handshake
  }

  handleDisconnect(_client: Socket) {
    // cleanup
  }

  // ─── Event Chat ──────────────────────────────────────────────────────────────

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
    const message = await this.chatService.createMessage(data.eventId, data.userId, data.content);
    this.server.to(`event-${data.eventId}`).emit('newMessage', message);
    return message;
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

  // ─── Direct Messages ─────────────────────────────────────────────────────────

  @SubscribeMessage('joinDmRoom')
  handleJoinDmRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`dm-${data.conversationId}`);
    return { event: 'joinedDmRoom', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('leaveDmRoom')
  handleLeaveDmRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`dm-${data.conversationId}`);
  }

  @SubscribeMessage('sendDirectMessage')
  async handleSendDirectMessage(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { conversationId: string; senderId: string; content: string },
  ) {
    const message = await this.directMessagesService.createMessage(
      data.conversationId,
      data.senderId,
      data.content,
    );
    this.server.to(`dm-${data.conversationId}`).emit('newDirectMessage', message);
    return message;
  }

  @SubscribeMessage('dmTyping')
  handleDmTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; displayName: string },
  ) {
    client.to(`dm-${data.conversationId}`).emit('dmUserTyping', {
      userId: data.userId,
      displayName: data.displayName,
    });
  }
}
