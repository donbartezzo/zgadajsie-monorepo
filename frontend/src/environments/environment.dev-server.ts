import { baseEnvironment } from './base';
import { PRODUCTION_FEATURE_FLAGS } from '@zgadajsie/shared';

export const environment = {
  ...baseEnvironment,
  production: true,
  clarityProjectId: null,
  mediaUrl: 'https://pub-a40201d08597423697d74c5e0db6e56f.r2.dev',
  ...PRODUCTION_FEATURE_FLAGS,
};
