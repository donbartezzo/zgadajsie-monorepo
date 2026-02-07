import { IsString, MinLength } from 'class-validator';

export class JoinGuestDto {
  @IsString()
  @MinLength(2)
  displayName: string;
}
