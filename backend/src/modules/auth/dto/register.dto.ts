import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;
}
