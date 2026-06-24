import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Linki społecznościowe: dozwolone wyłącznie bezpieczne schematy http(s).
// Blokujemy javascript:, data:, file: itp. (ochrona przed XSS przy renderze linku).
const ALLOWED_PROTOCOLS = ['https:', 'http:'];

@ValidatorConstraint({ name: 'isSafeSocialUrl', async: false })
export class IsSafeSocialUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }
    try {
      const url = new URL(value);
      return ALLOWED_PROTOCOLS.includes(url.protocol);
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'Link musi być poprawnym adresem URL ze schematem https:// (dozwolone też http://)';
  }
}

export function IsSafeSocialUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeSocialUrlConstraint,
    });
  };
}
