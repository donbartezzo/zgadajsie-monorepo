import { Module } from '@nestjs/common';
import { SlotService } from './slot.service';
import { EventRealtimeModule } from '../realtime/event-realtime.module';

@Module({
  imports: [EventRealtimeModule],
  providers: [SlotService],
  exports: [SlotService],
})
export class SlotModule {}
