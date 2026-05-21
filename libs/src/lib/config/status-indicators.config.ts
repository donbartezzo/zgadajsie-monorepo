// Jedno źródło prawdy dla status indicators (ikony statusu uczestnika).
// Używane w: EnrollmentGridItemComponent, UserProfileCard, DesignSystem.

export type StatusIndicatorColor =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral';

export type StatusIndicatorType =
  | 'needs_confirmation'
  | 'needs_payment'
  | 'pending'
  | 'approved'
  | 'withdrawn'
  | 'awaiting_approval'
  | 'is_guest'
  | 'banned'
  | 'trusted'
  | 'payment_completed'
  | 'payment_refunded'
  | 'payment_pending'
  | 'account_unverified'
  | 'email_not_verified'
  | 'confirmed'
  | 'rejected';

export interface StatusIndicatorConfig {
  icon: string;
  label: string;
  description: string;
  color: StatusIndicatorColor;
  requiresAction: boolean;
}

export interface StatusBadgeEntry {
  type: StatusIndicatorType;
  detail?: string | null;
}

export const STATUS_INDICATORS: Record<StatusIndicatorType, StatusIndicatorConfig> = {
  needs_confirmation: {
    icon: 'check-circle',
    label: 'Wymaga potwierdzenia',
    description:
      'Uczestnik posiada przydzielone miejsce, ale musi potwierdzić swój udział. W przypadku braku potwierdzenia uczestnictwo może zostać anulowane.',
    color: 'warning',
    requiresAction: true,
  },
  needs_payment: {
    icon: 'credit-card',
    label: 'Oczekuje na płatność',
    description:
      'Miejsce jest zarezerwowane, ale wymaga opłaty. Po upływie terminu rezerwacja może zostać anulowana.',
    color: 'warning',
    requiresAction: true,
  },
  pending: {
    icon: 'clock',
    label: 'Oczekuje na miejsce',
    description:
      'Brak przydzielonego miejsca. Należy oczekiwać na decyzję organizatora lub zwolnienie slotu.',
    color: 'warning',
    requiresAction: false,
  },
  approved: {
    icon: 'check-circle',
    label: 'Zatwierdzony',
    description:
      'Organizator zatwierdził udział. Należy oczekiwać na potwierdzenie miejsca lub dokonać opłaty za udział.',
    color: 'info',
    requiresAction: false,
  },
  withdrawn: {
    icon: 'log-out',
    label: 'Wypisany',
    description:
      'Rezygnacja z udziału. Uczestnik może ponownie dołączyć, jeśli są dostępne wolne miejsca.',
    color: 'neutral',
    requiresAction: false,
  },
  awaiting_approval: {
    icon: 'user-check',
    label: 'Wymaga zatwierdzenia',
    description: 'Zgłoszenie oczekuje na decyzję organizatora przed przydzieleniem miejsca.',
    color: 'warning',
    requiresAction: true,
  },
  is_guest: {
    icon: 'user-plus',
    label: 'Gość',
    description: 'Osoba dodana jako gość - nie posiada konta w serwisie.',
    color: 'info',
    requiresAction: false,
  },
  banned: {
    icon: 'ban',
    label: 'Zbanowany',
    description: 'Organizator zablokował możliwość udziału w swoich wydarzeniach.',
    color: 'danger',
    requiresAction: true,
  },
  trusted: {
    icon: 'shield-check',
    label: 'Zaufany uczestnik',
    description:
      'Organizator oznaczył uczestnika jako zaufanego - zgłoszenia mogą być traktowane priorytetowo.',
    color: 'success',
    requiresAction: false,
  },
  payment_completed: {
    icon: 'check-circle',
    label: 'Opłacone',
    description:
      'Opłata za udział została zaksięgowana. Potwierdzenie znajduje się w zakładce płatności.',
    color: 'success',
    requiresAction: false,
  },
  payment_refunded: {
    icon: 'corner-up-left',
    label: 'Zwrócone',
    description: 'Środki zostały zwrócone. Szczegóły znajdują się w zakładce płatności.',
    color: 'neutral',
    requiresAction: false,
  },
  payment_pending: {
    icon: 'clock',
    label: 'Płatność w toku',
    description:
      'Płatność jest przetwarzana. W przypadku braku zmiany statusu należy sprawdzić szczegóły w zakładce płatności.',
    color: 'warning',
    requiresAction: true,
  },
  account_unverified: {
    icon: 'alert-triangle',
    label: 'Konto niezweryfikowane',
    description: 'Konto wymaga weryfikacji, aby w pełni korzystać z serwisu.',
    color: 'warning',
    requiresAction: true,
  },
  email_not_verified: {
    icon: 'mail',
    label: 'Email nie zweryfikowany',
    description:
      'Należy zweryfikować adres email, aby w pełni korzystać z serwisu. Należy sprawdzić skrzynkę odbiorczą.',
    color: 'warning',
    requiresAction: true,
  },
  confirmed: {
    icon: 'check',
    label: 'Uczestnictwo potwierdzone',
    description: 'Uczestnik ma gwarantowane miejsce w wydarzeniu i potwierdził swój udział.',
    color: 'success',
    requiresAction: false,
  },
  rejected: {
    icon: 'x',
    label: 'Odrzucony',
    description:
      'Organizator odrzucił zgłoszenie. W przypadku pytań należy skontaktować się z organizatorem.',
    color: 'danger',
    requiresAction: false,
  },
};

// Helper function do pobierania konfiguracji po typie
export function getStatusIndicatorConfig(type: StatusIndicatorType): StatusIndicatorConfig {
  return STATUS_INDICATORS[type];
}
