import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { AnnouncementPriority } from '@zgadajsie/shared';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(['CRITICAL', 'ORGANIZATIONAL', 'INFORMATIONAL'])
  priority?: AnnouncementPriority;
}
