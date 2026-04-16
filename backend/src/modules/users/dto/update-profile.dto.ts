import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.decorator';
import { IsSupportedSupportUrl } from '../../../common/validators/support-url.validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

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
}
