// @TMP: konta wykluczone ze sprawdzania flag blokujących
const OVERRIDE_ACCOUNT_EMAILS = [
  'donbartezzo@gmail.com',
  'donbartezzo+zgadaj1@gmail.com',
  'donbartezzo+zgadaj2@gmail.com',
  'donbartezzo+zgadaj3@gmail.com',
];
export const isOverrideAccount = (email?: string | null): boolean =>
  OVERRIDE_ACCOUNT_EMAILS.includes(email ?? '');
