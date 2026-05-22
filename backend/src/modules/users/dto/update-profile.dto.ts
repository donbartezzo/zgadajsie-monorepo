import { IsEmail, IsOptional, IsString, MaxLength, MinLength, IsBoolean } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.decorator';
import { IsSupportedSupportUrl } from '../../../common/validators/support-url.validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  avatarSeed?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsSupportedSupportUrl()
  donationUrl?: string | null;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsStrongPassword()
  newPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string | null;

  @IsOptional()
  @IsBoolean()
  welcomeMessageEnabled?: boolean;
}
