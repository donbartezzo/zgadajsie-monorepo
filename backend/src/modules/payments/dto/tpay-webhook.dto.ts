import { IsOptional, IsString } from 'class-validator';

export class TpayWebhookDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  tr_id?: string;

  @IsOptional()
  @IsString()
  tr_date?: string;

  @IsOptional()
  @IsString()
  tr_crc?: string;

  @IsOptional()
  @IsString()
  tr_amount?: string;

  @IsOptional()
  @IsString()
  tr_paid?: string;

  @IsOptional()
  @IsString()
  tr_desc?: string;

  @IsOptional()
  @IsString()
  tr_status?: string;

  @IsOptional()
  @IsString()
  tr_error?: string;

  @IsOptional()
  @IsString()
  tr_email?: string;

  @IsOptional()
  @IsString()
  md5sum?: string;

  @IsOptional()
  @IsString()
  test_mode?: string;
}
