import { IsUUID } from 'class-validator';

export class AddAuthorizedOrganizerDto {
  @IsUUID()
  userId: string;
}
