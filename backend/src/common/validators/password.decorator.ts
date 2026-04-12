import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotCommonPassword } from './password.validator';

/**
 * Kombinuje wszystkie walidacje hasla w jeden dekorator
 * - Minimalna dlugosc: 8 znakow
 * - Maksymalna dlugosc: 60 znakow
 * - Sprawdzenie popularnych/hakowalnych hasel
 */
export function IsStrongPassword() {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'Haslo musi miec co najmniej 8 znaków.' }),
    MaxLength(60, { message: 'Haslo moze miec maksymalnie 60 znaków.' }),
    IsNotCommonPassword(),
  );
}
