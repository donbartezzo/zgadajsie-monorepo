import { Controller, Post, Get, Delete, Param, Body, UseGuards, Patch } from '@nestjs/common';
import { ParticipationService } from './participation.service';
import { SlotService } from '../slots/slot.service';
import { JoinEventDto, JoinGuestDto, ChangeRoleDto } from './dto/join-event.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller()
export class ParticipationController {
  constructor(
    private participationService: ParticipationService,
    private slotService: SlotService,
  ) {}

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
    return this.participationService.joinGuest(eventId, user.id, dto.displayName, dto.roleKey);
  }

  @Patch('participations/:id/update-guest')
  updateGuest(
    @Param('id') participationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateGuestDto,
  ) {
    return this.participationService.updateGuestName(participationId, user.id, dto.displayName);
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

  @Patch('participations/:id/role')
  changeRole(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.participationService.changeRole(id, user.id, dto.roleKey);
  }

  @Post('participations/:id/rejoin')
  rejoin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.rejoinById(id, user.id);
  }

  @Delete('participations/:id')
  deleteParticipation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.participationService.deleteParticipation(id, user.id);
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

  @Post('slots/:slotId/lock')
  lockSlot(@Param('slotId') slotId: string, @CurrentUser() user: AuthUser) {
    return this.slotService.lockSlotByOrganizer(slotId, user.id);
  }

  @Post('slots/:slotId/unlock')
  unlockSlot(@Param('slotId') slotId: string, @CurrentUser() user: AuthUser) {
    return this.slotService.unlockSlotByOrganizer(slotId, user.id);
  }

  @Post('slots/:slotId/assign-participant/:participationId')
  assignToLockedSlot(
    @Param('slotId') slotId: string,
    @Param('participationId') participationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.slotService.assignParticipantToLockedSlot(slotId, participationId, user.id);
  }
}
