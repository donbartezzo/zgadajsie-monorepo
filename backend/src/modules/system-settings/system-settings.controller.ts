import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AddAuthorizedOrganizerDto } from './dto/add-authorized-organizer.dto';
import { SystemSettings, AuthorizedOrganizer } from '@prisma/client';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getSettings(): Promise<SystemSettings> {
    return this.systemSettingsService.getSettings();
  }

  @Get('can-create-event')
  @UseGuards(JwtAuthGuard)
  async canCreateEvent(@CurrentUser() user: AuthUser): Promise<{ canCreate: boolean }> {
    return { canCreate: await this.systemSettingsService.canCurrentUserCreateEvents(user.id) };
  }
}

@Controller('system-settings/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  async getSettings(): Promise<SystemSettings> {
    return this.systemSettingsService.getSettings();
  }

  @Patch('event-creation-restricted')
  @HttpCode(HttpStatus.OK)
  async updateEventCreationRestricted(
    @Body('restricted') restricted: boolean,
  ): Promise<SystemSettings> {
    return this.systemSettingsService.updateEventCreationRestricted(restricted);
  }

  @Patch('online-payments-disabled')
  @HttpCode(HttpStatus.OK)
  async updateOnlinePaymentsDisabled(@Body('disabled') disabled: boolean): Promise<SystemSettings> {
    return this.systemSettingsService.updateOnlinePaymentsDisabled(disabled);
  }

  @Get('authorized-organizers')
  async getAuthorizedOrganizers(): Promise<AuthorizedOrganizer[]> {
    return this.systemSettingsService.getAuthorizedOrganizers();
  }

  @Post('authorized-organizers')
  async addAuthorizedOrganizer(
    @Body() dto: AddAuthorizedOrganizerDto,
  ): Promise<AuthorizedOrganizer> {
    return this.systemSettingsService.addAuthorizedOrganizer(dto.userId);
  }

  @Delete('authorized-organizers/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAuthorizedOrganizer(@Param('userId') userId: string): Promise<void> {
    return this.systemSettingsService.removeAuthorizedOrganizer(userId);
  }
}
