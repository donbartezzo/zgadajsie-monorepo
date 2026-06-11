import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.decorator';
import { IsSupportedSupportUrl } from '../../../common/validators/support-url.validator';
import { IsSafeSocialUrl } from '../../../common/validators/social-url.validator';

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

  // Max 3 linki społecznościowe (tylko URL, bez etykiet). Bezpieczne schematy http(s).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsSafeSocialUrl({ each: true })
  socialLinks?: string[];
}
