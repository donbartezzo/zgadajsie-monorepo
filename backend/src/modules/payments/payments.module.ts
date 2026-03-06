import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TpayService } from './tpay.service';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [VouchersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, TpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
