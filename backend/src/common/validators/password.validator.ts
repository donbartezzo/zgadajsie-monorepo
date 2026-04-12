import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * A small embedded list of the most common/weak passwords.
 * Checked case-insensitively. Focused on passwords that survive the min-length check.
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  'password12345',
  'password123456',
  'qwerty',
  'qwerty123',
  'qwerty1234',
  'qwerty12345',
  'qwerty123456',
  'qwertyuiop',
  'qwertyuiop12',
  '123456789012',
  '1234567890123',
  '111111111111',
  '222222222222',
  '000000000000',
  'aaaaaaaaaaaa',
  'admin123456',
  'admin1234567',
  'welcome12345',
  'letmein12345',
  'monkey123456',
  'dragon123456',
  'sunshine1234',
  'princess1234',
  'football1234',
  'master123456',
  'iloveyou1234',
  'zaq1xsw2cde3',
  'haslohaslo12',
  'haslo12345678',
  'polska123456',
  'kocham123456',
]);

@ValidatorConstraint({ name: 'isNotCommonPassword', async: false })
export class IsNotCommonPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return true;
    }
    return !COMMON_PASSWORDS.has(value.toLowerCase());
  }

  defaultMessage(): string {
    return 'To hasło jest zbyt popularne i łatwe do odgadnięcia. Wybierz inne hasło.';
  }
}

export function IsNotCommonPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotCommonPasswordConstraint,
    });
  };
}
