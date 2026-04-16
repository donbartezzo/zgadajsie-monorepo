import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const SUPPORTED_SUPPORT_DOMAINS = [
  'buycoffee.to',
  'buymeacoffee.com',
  'ko-fi.com',
  'patronite.pl',
  'suppi.pl',
  'zrzutka.pl',
  'tipply.pl',
  'paypal.me',
  'patreon.com',
  'liberapay.com',
  'streamlabs.com',
  'boosty.to',
  'coffeate.io',
] as const;

@ValidatorConstraint({ name: 'isSupportedSupportUrl', async: false })
export class IsSupportedSupportUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') {
        return false;
      }
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      return SUPPORTED_SUPPORT_DOMAINS.some(
        (domain) => host === domain || host.endsWith('.' + domain),
      );
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    const list = SUPPORTED_SUPPORT_DOMAINS.join(', ');
    return `Link musi prowadzić do jednego z obsługiwanych serwisów: ${list}`;
  }
}

export function IsSupportedSupportUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSupportedSupportUrlConstraint,
    });
  };
}
