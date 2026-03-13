import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(['CRITICAL', 'ORGANIZATIONAL', 'INFORMATIONAL'])
  priority?: string;
}
