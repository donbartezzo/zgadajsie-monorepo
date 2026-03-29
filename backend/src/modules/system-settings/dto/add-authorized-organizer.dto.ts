import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AddAuthorizedOrganizerDto {
  @IsUUID()
  userId: string;
}
