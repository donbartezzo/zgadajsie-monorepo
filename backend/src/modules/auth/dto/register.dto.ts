import { IsEmail, IsString, MinLength, IsOptional, IsEmpty } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @MinLength(3)
  displayName: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;

  @IsEmpty()
  website?: string;

  @IsEmpty()
  company?: string;

  @IsString()
  @IsOptional()
  formRenderedAt?: string;
}
