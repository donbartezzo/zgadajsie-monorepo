// Konfiguracja runtime dla flag aplikacyjnych
// Te wartości są przeznaczone do szybkiej zmiany w jednym miejscu dla całego monorepo

interface RuntimeConfig {
  maintenance: boolean;
  disableGoogleLogin: boolean;
  disableFacebookLogin: boolean;
  disableEventCreation: boolean;
  disableOnlinePayments: boolean;
}

const RUNTIME_CONFIG: RuntimeConfig = {
  maintenance: false,
  disableGoogleLogin: true,
  disableFacebookLogin: true,
  disableEventCreation: true,
  disableOnlinePayments: false,
};

// @TMP: konto wykluczone ze sprawdzania flag blokujących
const OVERRIDE_ACCOUNT_EMAIL = 'donbartezzo@gmail.com';
export const isOverrideAccount = (email?: string | null): boolean =>
  email === OVERRIDE_ACCOUNT_EMAIL;

// Wspólny helper dla frontend i backend
// Zapewnia spójne API dla obu środowisk
export const RuntimeConfig = {
  isMaintenanceEnabled: () => RUNTIME_CONFIG.maintenance,
  isGoogleLoginEnabled: () => !RUNTIME_CONFIG.disableGoogleLogin,
  isFacebookLoginEnabled: () => !RUNTIME_CONFIG.disableFacebookLogin,
  isEventCreationEnabled: () => !RUNTIME_CONFIG.disableEventCreation,
  isOnlinePaymentsEnabled: () => !RUNTIME_CONFIG.disableOnlinePayments,
} as const;
