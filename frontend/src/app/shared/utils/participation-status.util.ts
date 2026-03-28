import { WaitingReason } from '../types';
import { ParticipationStatus } from '../types/participation.interface';
import {
  getWaitingReasonBarTitle,
  getWaitingReasonBarSubtitle,
  getWaitingReasonOverlayDescription,
} from './waiting-reason-messages.util';

export interface ParticipationStatusConfig {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconColorClass: string;
  bgClass: string;
  borderClass: string;
  buttonLabel: string;
  needsAction?: boolean;
}

export interface ParticipationStatusOptions {
  isEnded?: boolean;
  waitingReason?: WaitingReason | null;
}

const STATUS_CONFIGS: Record<
  ParticipationStatus,
  (options?: ParticipationStatusOptions) => ParticipationStatusConfig
> = {
  PENDING: (options) => {
    const reason = options?.waitingReason ?? null;
    const isPreEnroll = reason === 'PRE_ENROLLMENT';
    const isBanned = reason === 'BANNED';

    return {
      title: getWaitingReasonBarTitle(reason),
      subtitle: getWaitingReasonBarSubtitle(reason),
      description: getWaitingReasonOverlayDescription(reason),
      icon: isPreEnroll ? 'users' : isBanned ? 'alert-triangle' : 'clock',
      iconColorClass: isPreEnroll
        ? 'text-info-600'
        : isBanned
          ? 'text-danger-600'
          : 'text-warning-600',
      bgClass: 'bg-warning-50',
      borderClass: 'border-t border-b border-warning-200',
      buttonLabel: 'Szczegóły',
      needsAction: false,
    };
  },
  APPROVED: () => ({
    title: 'Zatwierdzone - potwierdź udział!',
    subtitle: 'Twoje miejsce zostało przyznane.',
    description: 'Twoje miejsce zostało przyznane. Potwierdź uczestnictwo.',
    icon: 'check',
    iconColorClass: 'text-info-600',
    bgClass: 'bg-info-50',
    borderClass: 'border-t border-b border-info-200',
    buttonLabel: 'Potwierdź',
    needsAction: true,
  }),
  CONFIRMED: (options) => ({
    title: options?.isEnded ? 'Byłeś(aś) uczestnikiem' : 'Jesteś już potwierdzonym uczestnikiem!',
    subtitle: options?.isEnded
      ? 'To wydarzenie już się zakończyło.'
      : 'Twój udział jest potwierdzony.',
    description: options?.isEnded
      ? 'To wydarzenie już się zakończyło.'
      : 'Twój udział jest potwierdzony. Do zobaczenia!',
    icon: 'check',
    iconColorClass: 'text-success-600',
    bgClass: 'bg-success-50',
    borderClass: 'border-t border-b border-success-200',
    buttonLabel: 'Szczegóły',
    needsAction: false,
  }),
  WITHDRAWN: () => ({
    title: 'Wypisano z wydarzenia',
    subtitle: 'Nie jesteś już uczestnikiem.',
    description: 'Nie jesteś już uczestnikiem tego wydarzenia.',
    icon: 'user-x',
    iconColorClass: 'text-neutral-500',
    bgClass: 'bg-neutral-100',
    borderClass: 'border-t border-b border-neutral-200',
    buttonLabel: 'Szczegóły',
    needsAction: false,
  }),
  REJECTED: () => ({
    title: 'Zgłoszenie odrzucone',
    subtitle: 'Organizator odrzucił Twoje zgłoszenie.',
    description: 'Organizator odrzucił Twoje zgłoszenie.',
    icon: 'x',
    iconColorClass: 'text-danger-500',
    bgClass: 'bg-danger-50',
    borderClass: 'border-t border-b border-danger-200',
    buttonLabel: 'Szczegóły',
    needsAction: false,
  }),
};

// Fallback for legacy/unknown statuses
const DEFAULT_CONFIG: ParticipationStatusConfig = {
  title: 'Jesteś zapisany',
  subtitle: 'Dołączyłeś do tego wydarzenia.',
  description: 'Twój udział jest potwierdzony. Do zobaczenia!',
  icon: 'check',
  iconColorClass: 'text-success-600',
  bgClass: 'bg-success-50',
  borderClass: 'border-t border-b border-success-200',
  buttonLabel: 'Szczegóły',
  needsAction: false,
};

/**
 * Returns unified configuration for participation status
 */
export function getParticipationStatusConfig(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): ParticipationStatusConfig {
  if (!status || !STATUS_CONFIGS[status]) {
    return DEFAULT_CONFIG;
  }
  return STATUS_CONFIGS[status](options);
}

/**
 * Returns title for notification bar
 */
export function getParticipationStatusTitle(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).title;
}

/**
 * Returns subtitle for notification bar
 */
export function getParticipationStatusSubtitle(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).subtitle;
}

/**
 * Returns description for overlay/modal
 */
export function getParticipationStatusDescription(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).description;
}

/**
 * Returns button label for action button
 */
export function getParticipationStatusButtonLabel(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).buttonLabel;
}

/**
 * Returns icon name for status
 */
export function getParticipationStatusIcon(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).icon;
}

/**
 * Returns icon color class for status
 */
export function getParticipationStatusIconColor(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).iconColorClass;
}

/**
 * Returns background class for status
 */
export function getParticipationStatusBgClass(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).bgClass;
}

/**
 * Returns border class for status
 */
export function getParticipationStatusBorderClass(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): string {
  return getParticipationStatusConfig(status, options).borderClass;
}

/**
 * Returns whether status needs user action
 */
export function getParticipationStatusNeedsAction(
  status: ParticipationStatus | null,
  options?: ParticipationStatusOptions,
): boolean {
  return getParticipationStatusConfig(status, options).needsAction ?? false;
}

// Re-export waiting reason functions for convenience
export {
  getWaitingReasonMessages,
  getWaitingReasonToast,
  getWaitingReasonBarTitle,
  getWaitingReasonBarSubtitle,
  getWaitingReasonOverlayDescription,
} from './waiting-reason-messages.util';
