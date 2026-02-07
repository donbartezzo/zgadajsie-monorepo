import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AdminAdjustDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
