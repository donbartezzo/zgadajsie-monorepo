import { IsBoolean, IsOptional } from 'class-validator';

export class CancelPaymentDto {
  @IsOptional()
  @IsBoolean()
  refundAsVoucher?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean;
}
