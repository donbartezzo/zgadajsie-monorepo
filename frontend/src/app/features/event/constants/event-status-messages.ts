import { SemanticColor } from '../../../shared/types/colors';
import type { IconName } from '../../../shared/ui/icon/icon.component';

// ── Lifecycle status ──

export type EventLifecycleStatus = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED';

export interface LifecycleStatusAppearance {
  icon: IconName;
  color: SemanticColor;
  iconColorClass: string;
  bgClass: string;
  borderClass: string;
  titleColorClass: string;
}

export const LIFECYCLE_STATUS_APPEARANCE: Record<EventLifecycleStatus, LifecycleStatusAppearance> =
  {
    UPCOMING: {
      icon: 'calendar',
      color: 'primary',
      iconColorClass: 'text-primary-600',
      bgClass: 'bg-primary-50',
      borderClass: 'border-t border-b border-primary-200',
      titleColorClass: 'text-primary-700',
    },
    ONGOING: {
      icon: 'clock',
      color: 'success',
      iconColorClass: 'text-success-600',
      bgClass: 'bg-success-100',
      borderClass: 'border-t border-b border-success-300',
      titleColorClass: 'text-success-700',
    },
    ENDED: {
      icon: 'clock',
      color: 'neutral',
      iconColorClass: 'text-neutral-500',
      bgClass: 'bg-neutral-50',
      borderClass: 'border-t border-b border-neutral-200',
      titleColorClass: 'text-neutral-700',
    },
    CANCELLED: {
      icon: 'x',
      color: 'danger',
      iconColorClass: 'text-danger-600',
      bgClass: 'bg-danger-100',
      borderClass: 'border-t border-b border-danger-300',
      titleColorClass: 'text-danger-700',
    },
  };

// ── Static labels for status bar content ──

export interface StatusBarLabels {
  title: string;
  subtitle: string;
}

export const LIFECYCLE_STATUS_LABELS: Record<EventLifecycleStatus, StatusBarLabels> = {
  UPCOMING: {
    title: 'Nadchodzące wydarzenie',
    subtitle: 'Zapisz się',
  },
  ONGOING: {
    title: 'Wydarzenie w trakcie',
    subtitle: 'Nowe zapisy nie są przyjmowane',
  },
  ENDED: {
    title: 'Wydarzenie zakończone',
    subtitle: 'To wydarzenie już się odbyło',
  },
  CANCELLED: {
    title: 'Wydarzenie odwołane',
    subtitle: 'Wydarzenie zostało odwołane przez organizatora',
  },
};

// ── Action button labels ──

export const STATUS_BAR_ACTION_LABELS = {
  join: 'Zapisz się',
  details: 'Szczegóły',
  options: 'Opcje',
} as const;

// ── Inactive event modal messages ──

export interface EventStatusMessage {
  icon: 'clock' | 'x';
  color: SemanticColor;
  title: string;
  description: string;
}

export const EVENT_STATUS_MESSAGES: Record<'ENDED' | 'ONGOING' | 'CANCELLED', EventStatusMessage> =
  {
    ENDED: {
      icon: 'clock',
      color: 'neutral',
      title: 'Wydarzenie zakończone',
      description:
        'To wydarzenie już się odbyło i nie można się na nie zapisać. Sprawdź archiwum lub inne nadchodzące wydarzenia.',
    },
    ONGOING: {
      icon: 'clock',
      color: 'success',
      title: 'Wydarzenie aktualnie trwa',
      description:
        'Wydarzenie w trakcie - nowe zapisy nie są już przyjmowane. Sprawdź inne nadchodzące wydarzenia.',
    },
    CANCELLED: {
      icon: 'x',
      color: 'danger',
      title: 'Wydarzenie odwołane',
      description:
        'To wydarzenie zostało odwołane przez organizatora. Zapisy zostały zamknięte i nie można w nim uczestniczyć.',
    },
  };
