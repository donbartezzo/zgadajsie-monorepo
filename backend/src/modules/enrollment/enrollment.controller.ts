import { Controller, Post, Get, Delete, Param, Body, UseGuards, Patch } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { SlotService } from '../slots/slot.service';
import { JoinEventDto, JoinGuestDto, ChangeRoleDto } from './dto/join-event.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller()
export class EnrollmentController {
  constructor(
    private enrollmentService: EnrollmentService,
    private slotService: SlotService,
  ) {}

  @Post('events/:eventId/join')
  join(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinEventDto,
  ) {
    return this.enrollmentService.join(eventId, user.id, dto.roleKey);
  }

  @Post('events/:eventId/join-guest')
  joinGuest(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinGuestDto,
  ) {
    return this.enrollmentService.joinGuest(eventId, user.id, dto.displayName, dto.roleKey);
  }

  @Patch('enrollments/:id/update-guest')
  updateGuest(
    @Param('id') enrollmentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateGuestDto,
  ) {
    return this.enrollmentService.updateGuestName(enrollmentId, user.id, dto.displayName);
  }

  @Post('enrollments/:id/assign-slot')
  assignSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.assignSlotToParticipant(id, user.id);
  }

  @Post('enrollments/:id/confirm-slot')
  confirmSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.confirmSlot(id, user.id);
  }

  @Post('enrollments/:id/release-slot')
  releaseSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.releaseSlotFromParticipant(id, user.id);
  }

  @Patch('enrollments/:id/role')
  changeRole(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ChangeRoleDto) {
    return this.enrollmentService.changeRole(id, user.id, dto.roleKey);
  }

  @Post('enrollments/:id/rejoin')
  rejoin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.rejoinById(id, user.id);
  }

  @Delete('enrollments/:id')
  deleteEnrollment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.deleteParticipation(id, user.id);
  }

  @Post('enrollments/:id/leave')
  leave(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.leave(id, user.id);
  }

  @Post('enrollments/:id/pay')
  pay(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.initiateEventPayment(id, user.id);
  }

  @Get('events/:eventId/my-guests')
  getActiveGuests(@Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.getActiveGuestsForHost(eventId, user.id);
  }

  @Post('slots/:slotId/lock')
  lockSlot(@Param('slotId') slotId: string, @CurrentUser() user: AuthUser) {
    return this.slotService.lockSlotByOrganizer(slotId, user.id);
  }

  @Post('slots/:slotId/unlock')
  unlockSlot(@Param('slotId') slotId: string, @CurrentUser() user: AuthUser) {
    return this.slotService.unlockSlotByOrganizer(slotId, user.id);
  }

  @Post('slots/:slotId/assign-to-slot/:enrollmentId')
  assignToLockedSlot(
    @Param('slotId') slotId: string,
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.slotService.assignParticipantToLockedSlot(slotId, enrollmentId, user.id);
  }
}
