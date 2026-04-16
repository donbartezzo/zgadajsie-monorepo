// @TMP: konto wykluczone ze sprawdzania flag blokujących
const OVERRIDE_ACCOUNT_EMAIL = 'donbartezzo@gmail.com';
export const isOverrideAccount = (email?: string | null): boolean =>
  email === OVERRIDE_ACCOUNT_EMAIL;
