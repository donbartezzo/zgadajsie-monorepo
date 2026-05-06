import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { OrganizerDigestCron } from './organizer-digest.cron';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('organizer')
export class OrganizerController {
  constructor(
    private organizerService: OrganizerService,
    private digestCron: OrganizerDigestCron,
  ) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('digest')
  getDigest(@CurrentUser() user: AuthUser) {
    return this.organizerService.getDigestData(user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post('digest/send-email')
  @HttpCode(HttpStatus.OK)
  async sendDigestEmail(@CurrentUser() user: AuthUser) {
    await this.digestCron.sendDigestForUser(user.id);
    return { sent: true };
  }
}
