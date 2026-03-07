import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ParticipationService } from './participation.service';
import { JoinGuestDto } from './dto/join-guest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller()
export class ParticipationController {
  constructor(private participationService: ParticipationService) {}

  @Post('events/:eventId/join')
  join(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.participationService.join(eventId, user.id);
  }

  @Post('events/:eventId/join-guest')
  joinGuest(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinGuestDto,
  ) {
    return this.participationService.joinGuest(eventId, user.id, dto.displayName);
  }

  @Post('participations/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.accept(id, user.id);
  }

  @Post('participations/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.reject(id, user.id);
  }

  @Post('events/:eventId/leave')
  leave(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.participationService.leave(eventId, user.id);
  }

  @Post('events/:eventId/pay')
  pay(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.participationService.initiateEventPayment(eventId, user.id);
  }
}
