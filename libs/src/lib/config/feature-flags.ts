// Jedno źródło prawdy dla feature flags całego monorepo.
// Zmiana wymaga nowego deployu.

export interface FeatureFlags {
  maintenance: boolean;
  enableGoogleLogin: boolean;
  enableFacebookLogin: boolean;
  enableEventCreation: boolean;
  enableOnlinePayments: boolean;
}

export const DEV_FEATURE_FLAGS: FeatureFlags = {
  maintenance: false,
  enableGoogleLogin: true,
  enableFacebookLogin: true,
  enableEventCreation: true,
  enableOnlinePayments: true,
};

export const PRODUCTION_FEATURE_FLAGS: FeatureFlags = {
  maintenance: false,
  enableGoogleLogin: false,
  enableFacebookLogin: false,
  enableEventCreation: false,
  enableOnlinePayments: true,
};
