import { IsString, IsOptional, MinLength } from 'class-validator';

export class BaseJoinEventDto {
  @IsOptional()
  @IsString()
  roleKey?: string;
}

export class JoinEventDto extends BaseJoinEventDto {
  // Dla zwykłego użytkownika - tylko roleKey (displayName z profilu)
}

export class JoinGuestDto extends BaseJoinEventDto {
  @IsString()
  @MinLength(2)
  displayName: string;
}
