import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertDisciplineProfileDto {
  // Poziom zaawansowania (slug z EventLevel). Obowiązkowy. Walidacja „!= open" w serwisie.
  @IsString()
  @IsNotEmpty()
  levelSlug!: string;

  // Wizytówka — opcjonalna, bez minimum, max 500 znaków.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}
