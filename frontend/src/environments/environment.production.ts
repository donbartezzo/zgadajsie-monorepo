import { baseEnvironment } from './base';
import { PRODUCTION_FEATURE_FLAGS } from '@zgadajsie/shared';

export const environment = {
  ...baseEnvironment,
  production: true,
  clarityProjectId: 'wcl5tp283v',
  ...PRODUCTION_FEATURE_FLAGS,
};
