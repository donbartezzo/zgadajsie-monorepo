import { Injectable } from '@nestjs/common';
import { EventRealtimeInvalidationPayload, EventRealtimeScope } from '@zgadajsie/shared';
import { EventRealtimeGateway } from './event-realtime.gateway';

@Injectable()
export class EventRealtimeService {
  constructor(private readonly gateway: EventRealtimeGateway) {}

  invalidateEvent(eventId: string, scope: EventRealtimeScope = 'all'): void {
    if (!this.gateway.server) {
      return;
    }

    const payload: EventRealtimeInvalidationPayload = {
      eventId,
      scope,
      updatedAt: new Date().toISOString(),
    };

    this.gateway.server.to(this.gateway.getRoomName(eventId)).emit('event:invalidated', payload);
  }
}
