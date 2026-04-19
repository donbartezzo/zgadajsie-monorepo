import { APP_VERSION } from './version.js';
import { DEV_FEATURE_FLAGS } from '@zgadajsie/shared';

export const baseEnvironment = {
  version: APP_VERSION?.trim() || null,
  production: false,
  apiUrl: '/api',
  clarityProjectId: null as string | null,
  ...DEV_FEATURE_FLAGS,
};
