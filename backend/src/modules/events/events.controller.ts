import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.cancel(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.archive(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.duplicate(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id/auto-accept')
  toggleAutoAccept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.toggleAutoAccept(id, user.id);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) {
    return this.eventsService.getParticipants(id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post('series')
  createSeries(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
    return this.eventsService.createSeries(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id/series')
  updateSeries(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateSeries(id, user.id, dto);
  }
}
