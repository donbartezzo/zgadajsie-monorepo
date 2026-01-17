import { Controller, Get, Param, Post } from '@nestjs/common';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getAllEvents() {
    return this.eventService.getAllEvents();
  }

  @Get(':id')
  async getEventById(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }

  @Post(':id/join')
  async joinEvent(@Param('id') id: string) {
    return this.eventService.joinEvent(id);
  }

  @Post(':id/follow')
  async followEvent(@Param('id') id: string) {
    return this.eventService.followEvent(id);
  }
}