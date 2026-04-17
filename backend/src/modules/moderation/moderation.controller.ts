import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateReprimandDto } from './dto/create-reprimand.dto';
import { CreateBanDto } from './dto/create-ban.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, IsActiveGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  @Post('reprimands')
  createReprimand(@CurrentUser() user: AuthUser, @Body() dto: CreateReprimandDto) {
    return this.moderationService.createReprimand(user.id, dto);
  }

  @Get('reprimands/:userId')
  getReprimands(@Param('userId') userId: string) {
    return this.moderationService.getReprimands(userId);
  }

  @Post('ban')
  banUser(@CurrentUser() user: AuthUser, @Body() dto: CreateBanDto) {
    return this.moderationService.banUser(user.id, dto);
  }

  @Delete('ban/:targetUserId')
  unbanUser(@Param('targetUserId') targetUserId: string, @CurrentUser() user: AuthUser) {
    return this.moderationService.unbanUser(user.id, targetUserId);
  }

  @Post('trust/:targetUserId')
  trustUser(@Param('targetUserId') targetUserId: string, @CurrentUser() user: AuthUser) {
    return this.moderationService.trustUser(user.id, targetUserId);
  }

  @Delete('trust/:targetUserId')
  untrustUser(@Param('targetUserId') targetUserId: string, @CurrentUser() user: AuthUser) {
    return this.moderationService.untrustUser(user.id, targetUserId);
  }

  @Get('relations')
  getRelations(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.moderationService.getRelationsForOrganizer(
      user.id,
      page ? +page : 1,
      limit ? +limit : 20,
      sortBy,
      sortDir,
    );
  }

  @Get('relation/:targetUserId')
  getRelation(@Param('targetUserId') targetUserId: string, @CurrentUser() user: AuthUser) {
    return this.moderationService.getRelation(user.id, targetUserId);
  }
}
