import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TpayService } from './tpay.service';
import { TopupDto } from './dto/topup.dto';
import { AdminAdjustDto } from './dto/admin-adjust.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('wallets')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private tpayService: TpayService,
  ) {}

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('me')
  getBalance(@CurrentUser() user: AuthUser) {
    return this.walletService.getBalance(user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('me/transactions')
  getTransactions(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(user.id, page ? +page : 1, limit ? +limit : 20);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post('me/topup')
  async initTopup(@CurrentUser() user: AuthUser, @Body() dto: TopupDto) {
    const result = await this.tpayService.createTransaction(
      dto.amount,
      `Doładowanie portfela – ${dto.amount} PLN`,
      '/api/wallets/tpay-notification',
    );
    return result;
  }

  @Post('tpay-notification')
  async tpayNotification(@Body() body: Record<string, unknown>) {
    const verification = await this.tpayService.verifyNotification(body);
    if (verification.valid && verification.amount) {
      // TODO: find user by transaction and credit wallet
    }
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':userId')
  getAdminBalance(@Param('userId') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':userId/transactions')
  getAdminTransactions(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(userId, page ? +page : 1, limit ? +limit : 20);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':userId/adjust')
  adminAdjust(
    @Param('userId') userId: string,
    @CurrentUser() admin: AuthUser,
    @Body() dto: AdminAdjustDto,
  ) {
    return this.walletService.adminAdjust(userId, admin.id, dto.amount, dto.description);
  }
}
