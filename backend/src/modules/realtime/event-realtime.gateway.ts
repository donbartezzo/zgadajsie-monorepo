import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventRealtimeRoomPayload } from '@zgadajsie/shared';

@WebSocketGateway({ namespace: '/events', cors: { origin: '*' } })
export class EventRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(_client: Socket): void {
    // Public event updates — no handshake auth required for this invalidation channel.
  }

  handleDisconnect(_client: Socket): void {
    // Socket.IO cleans up rooms automatically on disconnect.
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventRealtimeRoomPayload,
  ) {
    if (!data.eventId) {
      return { event: 'error', data: { message: 'Missing eventId' } };
    }

    client.join(this.getRoomName(data.eventId));
    return { event: 'subscribed', data };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventRealtimeRoomPayload,
  ) {
    if (!data.eventId) {
      return { event: 'error', data: { message: 'Missing eventId' } };
    }

    client.leave(this.getRoomName(data.eventId));
    return { event: 'unsubscribed', data };
  }

  getRoomName(eventId: string): string {
    return `event-${eventId}`;
  }
}
