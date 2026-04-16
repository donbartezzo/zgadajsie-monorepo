import { DEV_FEATURE_FLAGS, PRODUCTION_FEATURE_FLAGS, FeatureFlags } from '@zgadajsie/shared';

const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';

export const featureFlags: FeatureFlags = isProduction
  ? PRODUCTION_FEATURE_FLAGS
  : DEV_FEATURE_FLAGS;
