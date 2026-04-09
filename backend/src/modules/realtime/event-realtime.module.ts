import { Module } from '@nestjs/common';
import { EventRealtimeGateway } from './event-realtime.gateway';
import { EventRealtimeService } from './event-realtime.service';

@Module({
  providers: [EventRealtimeGateway, EventRealtimeService],
  exports: [EventRealtimeGateway, EventRealtimeService],
})
export class EventRealtimeModule {}
