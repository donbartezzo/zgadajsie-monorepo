import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateGuestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  displayName: string;
}
