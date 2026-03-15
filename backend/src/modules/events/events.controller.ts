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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.eventsService.findOne(id, user?.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.cancel(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.duplicate(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.remove(id, user.id, user.role === 'ADMIN');
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id/auto-accept')
  toggleAutoAccept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.toggleAutoAccept(id, user.id);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) {
    return this.eventsService.getParticipants(id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post('series')
  createSeries(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.eventsService.createSeries(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id/series')
  updateSeries(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateSeries(id, user.id, dto);
  }
}
