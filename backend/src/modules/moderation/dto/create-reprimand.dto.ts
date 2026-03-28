import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum ReprimandTypeDtoEnum {
  REPRIMAND = 'REPRIMAND',
  BAN = 'BAN',
}

export class CreateReprimandDto {
  @IsString()
  toUserId: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsEnum(ReprimandTypeDtoEnum)
  type?: ReprimandTypeDtoEnum;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
