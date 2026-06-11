import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { DisciplineProfilesService } from './discipline-profiles.service';
import { UpsertDisciplineProfileDto } from './dto/upsert-discipline-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('discipline-profiles')
export class DisciplineProfilesController {
  constructor(private service: DisciplineProfilesService) {}

  @Get('me')
  getAllMine(@CurrentUser() user: AuthUser) {
    return this.service.getAllMine(user.id);
  }

  @Get('me/:disciplineSlug')
  getMine(@CurrentUser() user: AuthUser, @Param('disciplineSlug') disciplineSlug: string) {
    return this.service.getMine(user.id, disciplineSlug);
  }

  @Put('me/:disciplineSlug')
  upsertMine(
    @CurrentUser() user: AuthUser,
    @Param('disciplineSlug') disciplineSlug: string,
    @Body() dto: UpsertDisciplineProfileDto,
  ) {
    return this.service.upsertMine(user.id, disciplineSlug, dto);
  }
}
