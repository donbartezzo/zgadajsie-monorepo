import { APP_VERSION } from './version';

console.log('base.ts: APP_VERSION =', APP_VERSION);

export const baseEnvironment = {
  version: APP_VERSION?.trim() || null,
  production: false,
  apiUrl: '/api',
};
