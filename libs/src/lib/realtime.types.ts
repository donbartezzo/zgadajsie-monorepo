export type EventRealtimeScope = 'all' | 'event' | 'participants' | 'slots';

export interface EventRealtimeRoomPayload {
  eventId: string;
}

export interface EventRealtimeInvalidationPayload {
  eventId: string;
  scope: EventRealtimeScope;
  updatedAt: string;
}
