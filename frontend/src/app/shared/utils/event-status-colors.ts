import { EventLifecycleStatus } from '../../features/event/constants/event-status-messages';

/**
 * Event lifecycle status bar color classes mapping
 * Single source of truth for event lifecycle status bar styling
 * Used by: event-status-messages.ts
 */
export interface StatusBarColorClasses {
  bgClass: string;
  borderClass: string;
}

export const EVENT_STATUS_COLORS: Record<EventLifecycleStatus, StatusBarColorClasses> = {
  UPCOMING: {
    bgClass: 'bg-primary-500',
    borderClass: 'border-2 border-primary-500',
  },
  ONGOING: {
    bgClass: 'bg-success-400',
    borderClass: 'border-2 border-success-400',
  },
  ENDED: {
    bgClass: 'bg-neutral-400',
    borderClass: 'border-2 border-neutral-400',
  },
  CANCELLED: {
    bgClass: 'bg-danger-500',
    borderClass: 'border-2 border-danger-500',
  },
};

/**
 * Returns status bar color classes for a given event lifecycle status
 */
export function getEventStatusBarColorClasses(status: EventLifecycleStatus): StatusBarColorClasses {
  return EVENT_STATUS_COLORS[status];
}
