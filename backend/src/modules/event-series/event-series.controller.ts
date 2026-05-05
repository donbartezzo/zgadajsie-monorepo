import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { EventSeriesService } from './event-series.service';
import { CreateEventSeriesDto } from './dto/create-event-series.dto';
import { UpdateEventSeriesDto } from './dto/update-event-series.dto';
import { PreviewEventSeriesDto } from './dto/preview-event-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { featureFlags } from '../../common/config/feature-flags';
import { isOverrideAccount } from '@zgadajsie/shared';

@Controller('event-series')
export class EventSeriesController {
  constructor(private eventSeriesService: EventSeriesService) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventSeriesDto) {
    if (!featureFlags.enableEventSeries && !isOverrideAccount(user.email)) {
      throw new ForbiddenException('Tworzenie serii wydarzeń jest tymczasowo wyłączone.');
    }
    return this.eventSeriesService.createSeries(user.id, dto);
  }

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
  @Post('preview')
  preview(@Body() dto: PreviewEventSeriesDto) {
    return this.eventSeriesService.previewDates(dto);
  }
}
