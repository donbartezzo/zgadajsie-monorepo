import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('vouchers')
@UseGuards(JwtAuthGuard, IsActiveGuard)
export class VouchersController {
  constructor(private vouchersService: VouchersService) {}

  @Get('my')
  getMyVouchers(@CurrentUser() user: AuthUser) {
    return this.vouchersService.getUserVouchers(user.id);
  }

  @Get('balance/:organizerId')
  getBalance(@CurrentUser() user: AuthUser, @Param('organizerId') organizerId: string) {
    return this.vouchersService.getBalance(user.id, organizerId);
  }
}
