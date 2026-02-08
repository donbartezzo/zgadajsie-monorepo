import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateReprimandDto } from './dto/create-reprimand.dto';
import { CreateBanDto } from './dto/create-ban.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard)
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

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('bans')
  createBan(@CurrentUser() admin: AuthUser, @Body() dto: CreateBanDto) {
    return this.moderationService.createBan(admin.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete('bans/:id')
  removeBan(@Param('id') id: string) {
    return this.moderationService.removeBan(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('bans')
  getBans(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.moderationService.getBans(page ? +page : 1, limit ? +limit : 20);
  }
}
