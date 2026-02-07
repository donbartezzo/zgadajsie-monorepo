import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateReprimandDto {
  @IsString()
  toUserId: string;

  @IsString()
  eventId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
