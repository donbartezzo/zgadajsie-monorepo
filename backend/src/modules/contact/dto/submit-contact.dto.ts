import {
  IsEmail,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContactSource } from '@prisma/client';

export class SubmitContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsEnum(ContactSource)
  @IsOptional()
  source?: ContactSource;

  @IsString()
  @IsOptional()
  citySlug?: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;

  // Honeypot field - must be empty to pass validation (detects bots)
  @IsEmpty()
  website?: string;

  // Honeypot field - must be empty to pass validation (detects bots)
  @IsEmpty()
  company?: string;

  @IsString()
  @IsOptional()
  formRenderedAt?: string;
}
