import { APP_VERSION } from './version';
import { DEV_FEATURE_FLAGS } from '@zgadajsie/shared';

export const baseEnvironment = {
  version: APP_VERSION?.trim() || null,
  production: false,
  apiUrl: '/api',
  clarityProjectId: null as string | null,
  mediaUrl: '' as string,
  // Wspólny bucket publiczny (covery dyscyplin zarządzane przez admina) - ten sam host
  // we WSZYSTKICH środowiskach, więc definiujemy go raz tutaj (bez override w environment.*).
  // Patrz docs/implementation-plan-cover-images-buckets.md
  publicMediaUrl: 'https://pub-1ae4230bedb64658a034b3a7c70804c1.r2.dev',
  ...DEV_FEATURE_FLAGS,
};
