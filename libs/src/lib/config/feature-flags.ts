// Jedno źródło prawdy dla feature flags całego monorepo.
// Zmiana wymaga nowego deployu.

export interface FeatureFlags {
  // Pusty string => maintenance WYŁĄCZONY.
  // Niepusty => maintenance WŁĄCZONY, a wartość to "hasło" furtki dla admina:
  // localStorage.setItem('maintenanceBypass', '<ta wartość>') odsłania UI mimo maintenance.
  // UWAGA: wartość trafia do bundla fronta, więc jest jawna - to miękka bramka, nie sekret.
  maintenance: string;
  enableGoogleLogin: boolean;
  enableFacebookLogin: boolean;
  enableEventCreation: boolean;
  enableOnlinePayments: boolean;
  enableEventSeries: boolean;
  enableFakeUsers: boolean;
  enableEmails: boolean;
  enableTurnstileCaptcha: boolean;
  enablePublicCoverManagement: boolean;
  enableFooterAd: boolean;
}

export const DEV_FEATURE_FLAGS: FeatureFlags = {
  maintenance: '',
  enableGoogleLogin: false,
  enableFacebookLogin: false,
  enableEventCreation: true,
  enableOnlinePayments: false,
  enableEventSeries: true,
  enableFakeUsers: true,
  enableEmails: false,
  enableTurnstileCaptcha: true,
  enablePublicCoverManagement: false,
  enableFooterAd: false,
};

export const PRODUCTION_FEATURE_FLAGS: FeatureFlags = {
  maintenance: '', // '' -> maintenanace nieaktywny
  enableGoogleLogin: false,
  enableFacebookLogin: false,
  enableEventCreation: false,
  enableOnlinePayments: false,
  enableEventSeries: true,
  enableFakeUsers: true,
  enableEmails: true,
  enableTurnstileCaptcha: true,
  enablePublicCoverManagement: true,
  enableFooterAd: false,
};
