// Jedno źródło prawdy dla feature flags całego monorepo.
// Zmiana wymaga nowego deployu.

export interface FeatureFlags {
  maintenance: boolean;
  enableGoogleLogin: boolean;
  enableFacebookLogin: boolean;
  enableEventCreation: boolean;
  enableOnlinePayments: boolean;
  enableEventSeries: boolean;
  enableFakeUsers: boolean;
  enableEmails: boolean;
}

export const DEV_FEATURE_FLAGS: FeatureFlags = {
  maintenance: false,
  enableGoogleLogin: true,
  enableFacebookLogin: true,
  enableEventCreation: true,
  enableOnlinePayments: true,
  enableEventSeries: true,
  enableFakeUsers: true,
  enableEmails: true,
};

export const PRODUCTION_FEATURE_FLAGS: FeatureFlags = {
  maintenance: false,
  enableGoogleLogin: false,
  enableFacebookLogin: false,
  enableEventCreation: false,
  enableOnlinePayments: true,
  enableEventSeries: true,
  enableFakeUsers: true,
  enableEmails: true,
};
