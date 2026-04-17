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
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Role, isOverrideAccount } from '@zgadajsie/shared';
import { featureFlags } from '../../common/config/feature-flags';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    if (!featureFlags.enableEventCreation && !isOverrideAccount(user.email)) {
      throw new ForbiddenException(
        'Tworzenie nowych wydarzeń jest tymczasowo wyłączone. Przepraszamy za utrudnienia.',
      );
    }

    return this.eventsService.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser | null) {
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
  @Get(':id/duplicate')
  getEventForDuplication(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.getEventForDuplication(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.duplicate(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.remove(id, user.id, user.role === Role.ADMIN);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/enrollments')
  getEnrollments(@Param('id') id: string) {
    return this.eventsService.getParticipants(id);
  }

  @Get(':id/slots')
  getSlots(@Param('id') id: string) {
    return this.eventsService.getSlots(id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/mark-paid/:enrollmentId')
  markPaid(
    @Param('id') id: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.markPaid(id, enrollmentId, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/cancel-payment/:paymentId')
  cancelPayment(
    @Param('id') id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelPaymentDto,
  ) {
    return this.eventsService.cancelPayment(id, paymentId, user.id, dto);
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
