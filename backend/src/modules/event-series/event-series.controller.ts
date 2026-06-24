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
  ForbiddenException,
} from '@nestjs/common';
import { EventSeriesService } from './event-series.service';
import { CreateSeriesFromEventDto } from './dto/create-series-from-event.dto';
import { UpdateEventSeriesDto } from './dto/update-event-series.dto';
import { PreviewEventSeriesDto } from './dto/preview-event-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { featureFlags } from '../../common/config/feature-flags';
import { isOverrideAccount } from '@zgadajsie/shared';
import { IsUUID } from 'class-validator';

class ConfirmByTokenQuery {
  @IsUUID()
  token: string;
}

@Controller('event-series')
export class EventSeriesController {
  constructor(private eventSeriesService: EventSeriesService) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('mine')
  getMine(@CurrentUser() user: AuthUser) {
    return this.eventSeriesService.findMySeries(user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventSeriesService.findOne(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEventSeriesDto,
  ) {
    return this.eventSeriesService.update(id, user, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Delete(':id')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventSeriesService.deactivate(id, user);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Patch(':id/confirm-event/:eventId')
  confirmEvent(
    @Param('id') seriesId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventSeriesService.confirmEvent(seriesId, eventId, user);
  }

  @Patch('confirm-event-by-token')
  confirmEventByToken(@Query() query: ConfirmByTokenQuery) {
    return this.eventSeriesService.confirmEventByToken(query.token);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post('from-event/:eventId')
  createFromEvent(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() dto: CreateSeriesFromEventDto,
  ) {
    if (!featureFlags.enableEventSeries && !isOverrideAccount(user.email)) {
      throw new ForbiddenException('Tworzenie serii wydarzeń jest tymczasowo wyłączone.');
    }
    return this.eventSeriesService.createSeriesFromEvent(user.id, eventId, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post('preview')
  preview(@Body() dto: PreviewEventSeriesDto) {
    return this.eventSeriesService.previewDates(dto);
  }
}
