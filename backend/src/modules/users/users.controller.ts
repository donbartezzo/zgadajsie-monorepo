import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('me/events')
  getMyEvents(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyEvents(user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('me/participations')
  getMyParticipations(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyParticipations(user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('me/reprimands')
  getMyReprimands(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyReprimands(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }
}
