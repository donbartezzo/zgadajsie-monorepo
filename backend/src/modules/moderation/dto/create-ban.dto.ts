import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateBanDto {
  @IsString()
  userId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
