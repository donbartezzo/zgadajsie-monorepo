import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ParticipationService } from './participation.service';
import { JoinGuestDto } from './dto/join-guest.dto';
import { JoinEventDto } from './dto/join-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller()
export class ParticipationController {
  constructor(private participationService: ParticipationService) {}

  @Post('events/:eventId/join')
  join(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinEventDto,
  ) {
    return this.participationService.join(eventId, user.id, dto.roleKey);
  }

  @Post('events/:eventId/join-guest')
  joinGuest(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinGuestDto,
  ) {
    return this.participationService.joinGuest(eventId, user.id, dto.displayName);
  }

  @Post('participations/:id/assign-slot')
  assignSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.assignSlotToParticipant(id, user.id);
  }

  @Post('participations/:id/confirm-slot')
  confirmSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.confirmSlot(id, user.id);
  }

  @Post('participations/:id/release-slot')
  releaseSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.releaseSlotFromParticipant(id, user.id);
  }

  @Post('participations/:id/leave')
  leave(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.leave(id, user.id);
  }

  @Post('participations/:id/pay')
  pay(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.initiateEventPayment(id, user.id);
  }

  @Get('events/:eventId/my-guests')
  getActiveGuests(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.participationService.getActiveGuestsForHost(eventId, user.id);
  }
}
