import { baseEnvironment } from './base';
import { PRODUCTION_FEATURE_FLAGS } from '@zgadajsie/shared';

export const environment = {
  ...baseEnvironment,
  production: true,
  clarityProjectId: 'wcl5tp283v',
  mediaUrl: 'https://pub-19c789f4a4204aa3b3a63add2d7f97a4.r2.dev',
  ...PRODUCTION_FEATURE_FLAGS,
};
