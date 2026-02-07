import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TpayService } from './tpay.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, TpayService],
  exports: [WalletService],
})
export class WalletModule {}
