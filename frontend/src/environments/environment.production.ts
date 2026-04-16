import { baseEnvironment } from './base';
import { PRODUCTION_FEATURE_FLAGS } from '@zgadajsie/shared';

export const environment = {
  ...baseEnvironment,
  production: true,
  ...PRODUCTION_FEATURE_FLAGS,
};
