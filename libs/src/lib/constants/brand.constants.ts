export const APP_BRAND = {
  /** Primary brand name - should be used everywhere */
  NAME: 'ZgadajSie.pl',

  /** Short version for UI constraints */
  SHORT_NAME: 'ZgadajSie.pl',

  /** Domain/URL */
  DOMAIN: 'zgadajsie.pl',

  /** Email domain */
  EMAIL_DOMAIN: 'zgadajsie.pl',

  /** Contact email */
  CONTACT_EMAIL: 'kontakt@zgadajsie.pl',

  /** No-reply email */
  NOREPLY_EMAIL: 'kontakt@zgadajsie.pl',

  /** Tagline */
  TAGLINE: 'Zgadaj się na wspólną grę!',

  /** Full description */
  DESCRIPTION: 'Zgadaj się na wspólną grę – organizuj i dołączaj do wydarzeń',
} as const;

/** Export type for type safety */
export type AppBrand = typeof APP_BRAND;
