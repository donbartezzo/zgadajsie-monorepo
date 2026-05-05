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
  | 'needs_payment'
  | 'pending'
  | 'approved'
  | 'withdrawn'
  | 'new_user_pending'
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
      'Brak przydzielonego miejsca. Czekaj na decyzję organizatora lub zwolnienie slotu.',
    color: 'warning',
    requiresAction: false,
  },
  approved: {
    icon: 'check-circle',
    label: 'Zatwierdzony',
    description:
      'Organizator zatwierdził udział. Czekaj na potwierdzenie miejsca lub opłać udział.',
    color: 'info',
    requiresAction: false,
  },
  withdrawn: {
    icon: 'log-out',
    label: 'Wypisany',
    description: 'Rezygnacja z udziału. Możesz ponownie dołączyć, jeśli są wolne miejsca.',
    color: 'neutral',
    requiresAction: false,
  },
  new_user_pending: {
    icon: 'help-circle',
    label: 'Nowy uczestnik',
    description:
      'Pierwsze wydarzenie u tego organizatora. Zgłoszenie wymaga dodatkowej weryfikacji.',
    color: 'info',
    requiresAction: true,
  },
  is_guest: {
    icon: 'user-plus',
    label: 'Gość',
    description: 'Osoba dodana jako gość — nie posiada konta na platformie.',
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
      'Organizator oznaczył jako zaufanego — zgłoszenia mogą być traktowane priorytetowo.',
    color: 'success',
    requiresAction: false,
  },
  payment_completed: {
    icon: 'check-circle',
    label: 'Opłacone',
    description:
      'Opłata za udział została zaksięgowana. Potwierdzenie znajdziesz w zakładce płatności.',
    color: 'success',
    requiresAction: false,
  },
  payment_refunded: {
    icon: 'corner-up-left',
    label: 'Zwrócone',
    description: 'Środki zostały zwrócone. Sprawdź szczegóły w zakładce płatności.',
    color: 'neutral',
    requiresAction: false,
  },
  payment_pending: {
    icon: 'clock',
    label: 'Płatność w toku',
    description:
      'Płatność jest przetwarzana. Jeśli status się nie zmieni, sprawdź w zakładce płatności.',
    color: 'warning',
    requiresAction: true,
  },
  account_unverified: {
    icon: 'alert-triangle',
    label: 'Konto niezweryfikowane',
    description: 'Konto wymaga weryfikacji, aby w pełni korzystać z platformy.',
    color: 'warning',
    requiresAction: true,
  },
  email_not_verified: {
    icon: 'mail',
    label: 'Email nie zweryfikowany',
    description:
      'Zweryfikuj adres email, aby w pełni korzystać z platformy. Sprawdź skrzynkę odbiorczą.',
    color: 'warning',
    requiresAction: true,
  },
  confirmed: {
    icon: 'check',
    label: 'Potwierdzony',
    description: 'Potwierdzone miejsce na wydarzeniu. Pamiętaj o terminie i lokalizacji!',
    color: 'success',
    requiresAction: false,
  },
  rejected: {
    icon: 'x',
    label: 'Odrzucony',
    description:
      'Organizator odrzucił zgłoszenie. Skontaktuj się z organizatorem, jeśli masz pytania.',
    color: 'danger',
    requiresAction: false,
  },
};

// Helper function do pobierania konfiguracji po typie
export function getStatusIndicatorConfig(type: StatusIndicatorType): StatusIndicatorConfig {
  return STATUS_INDICATORS[type];
}
