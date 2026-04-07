import { APP_VERSION } from './version';

export const baseEnvironment = {
  version: APP_VERSION?.trim() || null,
  production: false,
  apiUrl: '/api',
};
