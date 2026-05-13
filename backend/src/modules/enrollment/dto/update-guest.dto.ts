import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateGuestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  avatarSeed?: string | null;
}
