import { IsString, IsOptional, MinLength, MaxLength, IsUUID, IsNotEmpty } from 'class-validator';

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
  @MinLength(3)
  displayName: string;

  // Profil dyscypliny gościa (snapshot) — poziom obowiązkowy (walidacja „!= open" w serwisie),
  // wizytówka opcjonalna (max 500). Trafia do UserGuestDetails.
  @IsString()
  @IsNotEmpty()
  levelSlug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @IsOptional()
  @IsString()
  avatarSeed?: string;

  // Optional client-generated UUID for the new guest user. Avatar fingerprint is
  // derived from (userId + avatarSeed), so when client wants the preview avatar
  // shown during enrollment to match the final avatar in the participants grid,
  // it must pre-generate the user id and pass it here. Falls back to Prisma's
  // default uuid() when omitted.
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class ChangeRoleDto {
  @IsString()
  roleKey: string;
}
