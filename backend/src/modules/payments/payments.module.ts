import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TpayService } from './tpay.service';
import { VouchersModule } from '../vouchers/vouchers.module';
import { EventRealtimeModule } from '../realtime/event-realtime.module';

@Module({
  imports: [VouchersModule, EventRealtimeModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, TpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
