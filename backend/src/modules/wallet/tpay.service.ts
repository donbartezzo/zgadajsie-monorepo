import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TpayService {
  constructor(private configService: ConfigService) {}

  async createTransaction(amount: number, description: string, callbackUrl: string) {
    // TODO: implement Tpay API call
    const tpayApiUrl = this.configService.get<string>('TPAY_API_URL');
    return {
      transactionId: `tpay-${Date.now()}`,
      paymentUrl: `${tpayApiUrl}/payment-mock`,
    };
  }

  async verifyNotification(body: any): Promise<{ valid: boolean; transactionId?: string; amount?: number }> {
    // TODO: implement Tpay notification verification
    return { valid: true, transactionId: body.tr_id, amount: body.tr_amount };
  }
}
