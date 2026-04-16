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

export function isSupportedDonationUrl(url: string): boolean {
  if (!url) {
    return true;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return SUPPORTED_SUPPORT_DOMAINS.some(
      (domain) => host === domain || host.endsWith('.' + domain),
    );
  } catch {
    return false;
  }
}
