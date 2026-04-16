import { APP_VERSION } from './version';
import { DEV_FEATURE_FLAGS } from '@zgadajsie/shared';

export const baseEnvironment = {
  version: APP_VERSION?.trim() || null,
  production: false,
  apiUrl: '/api',
  ...DEV_FEATURE_FLAGS,
};
