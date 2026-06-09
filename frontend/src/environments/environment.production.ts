import { baseEnvironment } from './base';
import { PRODUCTION_FEATURE_FLAGS } from '@zgadajsie/shared';

export const environment = {
  ...baseEnvironment,
  production: true,
  clarityProjectId: 'wcl5tp283v',
  mediaUrl: 'https://pub-036e485738964fee826ad172a9733c55.r2.dev',
  ...PRODUCTION_FEATURE_FLAGS,
};
