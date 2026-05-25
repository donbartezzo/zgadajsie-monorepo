import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserCoverImageDto {
  @IsString()
  @MinLength(3, { message: 'Nazwa musi mieć minimum 3 znaki' })
  @MaxLength(100, { message: 'Nazwa może mieć maksymalnie 100 znaków' })
  name: string;
}
