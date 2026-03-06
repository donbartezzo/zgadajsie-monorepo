import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  Res,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { TpayWebhookDto } from './dto/tpay-webhook.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { TpayWebhookPayload } from './tpay.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('tpay-webhook')
  async handleWebhook(
    @Body(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
    body: TpayWebhookDto,
    @Headers('x-jws-signature') jwsSignature: string | undefined,
    @Res() res: Response,
  ) {
    await this.paymentsService.handleWebhook(body as unknown as TpayWebhookPayload, jwsSignature);
    // Tpay expects HTTP 200 with body "TRUE" (plain text)
    res.status(200).type('text/plain').send('TRUE');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('simulate-success/:intentId')
  async simulateSuccess(@Param('intentId', ParseUUIDPipe) intentId: string) {
    await this.paymentsService.simulateSuccessfulPayment(intentId);
    return { success: true, message: 'Payment completed successfully' };
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('my-payments')
  getMyPayments(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.paymentsService.getMyPayments(user.id, query.page, query.limit);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get(':id/status')
  getPaymentStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('intent/:intentId/status')
  getIntentPaymentStatus(@Param('intentId', ParseUUIDPipe) intentId: string, @CurrentUser() user: AuthUser) {
    return this.paymentsService.getIntentPaymentStatus(intentId, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Get('event/:eventId/earnings')
  getEventEarnings(@Param('eventId', ParseUUIDPipe) eventId: string, @CurrentUser() user: AuthUser) {
    return this.paymentsService.getEventEarnings(eventId, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/refund-voucher')
  refundAsVoucher(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.paymentsService.refundAsVoucher(id, user.id);
  }

  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @Post(':id/refund-money')
  refundAsMoney(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.paymentsService.refundAsMoney(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  getAdminPayments(@Query() query: PaginationQueryDto) {
    return this.paymentsService.getAdminPayments(query.page, query.limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  getAdminPaymentDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getAdminPaymentDetail(id);
  }
}
