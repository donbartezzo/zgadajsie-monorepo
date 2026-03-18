import { IsOptional, IsString } from 'class-validator';

export class JoinEventDto {
  @IsOptional()
  @IsString()
  roleKey?: string;
}
