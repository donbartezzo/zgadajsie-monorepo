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

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
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
}
