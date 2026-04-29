import { SemanticColor } from '../../../shared/types/colors';
import {
  getEventStatusBarColorClasses,
  type StatusBarColorClasses,
} from '../../../shared/utils/event-status-colors';

// ── Lifecycle status ──

export type EventLifecycleStatus = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED';

export type LifecycleAppearance = StatusBarColorClasses;

export interface EventLifecycleConfig {
  color: SemanticColor;
  appearance: LifecycleAppearance;
  title: string;
  subtitle?: string;
  description?: string;
}

const SUBTITLE_ENROLLMENT_CLOSED = 'Nowe zapisy nie są już przyjmowane';

export const EVENT_LIFECYCLE_CONFIG: Record<EventLifecycleStatus, EventLifecycleConfig> = {
  UPCOMING: {
    color: 'primary',
    appearance: getEventStatusBarColorClasses('UPCOMING'),
    title: 'Dołącz do wydarzenia',
    subtitle: 'Możesz zapisać się na to wydarzenie',
  },
  ONGOING: {
    color: 'success',
    appearance: getEventStatusBarColorClasses('ONGOING'),
    title: 'Wydarzenie w trakcie',
    subtitle: SUBTITLE_ENROLLMENT_CLOSED,
    description:
      'Wydarzenie jest właśnie w toku - uczestnicy są już na miejscu. Nowe zapisy i lista oczekujących zostały zamknięte.  Sprawdź inne nadchodzące wydarzenia.',
  },
  ENDED: {
    color: 'neutral',
    appearance: getEventStatusBarColorClasses('ENDED'),
    title: 'Wydarzenie zakończone',
    subtitle: SUBTITLE_ENROLLMENT_CLOSED,
    description:
      'To wydarzenie już się odbyło i nie przyjmuje nowych zapisów. Jeśli interesuje Cię kolejna edycja, możesz skontaktować się z organizatorem lub po prostu sprawdź nadchodzące wydarzenia.',
  },
  CANCELLED: {
    color: 'danger',
    appearance: getEventStatusBarColorClasses('CANCELLED'),
    title: 'Wydarzenie odwołane',
    subtitle: SUBTITLE_ENROLLMENT_CLOSED,
    description:
      'To wydarzenie zostało odwołane przez organizatora i nie odbędzie się w planowanym terminie. Zapisy i lista oczekujących zostały zamknięte. Sprawdź inne nadchodzące wydarzenia.',
  },
};

// ── Action button labels ──

export const STATUS_BAR_ACTION_LABELS = {
  join: 'Zapisz się',
} as const;
