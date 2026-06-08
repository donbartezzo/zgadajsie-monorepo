/**
 * Stałe URL-e dla zewnętrznych usług publicznych.
 * Te URL-e są stałe i nie zależą od środowiska.
 */

export const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
export const CLARITY_SCRIPT_SRC = (projectId: string) => `https://www.clarity.ms/tag/${projectId}`;
export const FACEBOOK_SHARE_URL = 'https://www.facebook.com/sharer/sharer.php';
export const TWITTER_SHARE_URL = 'https://twitter.com/intent/tweet';
export const WHATSAPP_SHARE_URL = 'https://wa.me/';
