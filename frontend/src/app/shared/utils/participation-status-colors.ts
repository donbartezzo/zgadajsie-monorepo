import { ParticipationStatus } from '../types/participation.interface';

/**
 * Unified status color classes mapping
 * Single source of truth for all status styling (status bars, enrollment grid, etc.)
 * Used by: participation-status.util.ts, slot-status-config.ts
 */
export interface StatusColorClasses {
  bgClass: string;
  bgLightClass: string;
  textClass: string;
  borderClass: string;
  borderColorClass: string;
}

/**
 * Maps participation status to unified color classes
 */
export const PARTICIPATION_STATUS_COLORS: Record<ParticipationStatus, StatusColorClasses> = {
  PENDING: {
    bgClass: 'bg-info-500',
    bgLightClass: 'bg-info-50',
    textClass: 'text-info-500',
    borderClass: 'border-2 border-info-500',
    borderColorClass: 'border-info-500',
  },
  APPROVED: {
    bgClass: 'bg-info-500',
    bgLightClass: 'bg-info-50',
    textClass: 'text-info-500',
    borderClass: 'border-2 border-info-500',
    borderColorClass: 'border-info-500',
  },
  CONFIRMED: {
    bgClass: 'bg-success-500',
    bgLightClass: 'bg-success-50',
    textClass: 'text-success-500',
    borderClass: 'border-2 border-success-500',
    borderColorClass: 'border-success-500',
  },
  WITHDRAWN: {
    bgClass: 'bg-neutral-500',
    bgLightClass: 'bg-neutral-50',
    textClass: 'text-neutral-500',
    borderClass: 'border-2 border-neutral-500',
    borderColorClass: 'border-neutral-500',
  },
  REJECTED: {
    bgClass: 'bg-neutral-500',
    bgLightClass: 'bg-neutral-50',
    textClass: 'text-neutral-500',
    borderClass: 'border-2 border-neutral-500',
    borderColorClass: 'border-neutral-500',
  },
};

/**
 * Returns status color classes for a given participation status
 */
export function getParticipationStatusColorClasses(
  status: ParticipationStatus,
): StatusColorClasses {
  return PARTICIPATION_STATUS_COLORS[status];
}

// ════════════════════════════════════════════════════════
// Slot display status mapping (for enrollment grid section)
// Maps slot statuses to participation status colors
// ════════════════════════════════════════════════════════

export type SlotDisplayStatus = 'assigned' | 'pending' | 'withdrawn' | 'free' | 'non-participant';

/**
 * Maps slot display status to participation status for color lookup
 */
function mapSlotToParticipationStatus(slotStatus: SlotDisplayStatus): ParticipationStatus {
  switch (slotStatus) {
    case 'assigned':
      return 'CONFIRMED';
    case 'pending':
      return 'PENDING';
    case 'withdrawn':
      return 'WITHDRAWN';
    case 'free':
      return 'PENDING'; // Use info color for free slots
    case 'non-participant':
      return 'PENDING'; // Use info color for non-participants (neutral not available)
  }
}

/**
 * Returns status color classes for a given slot display status
 * Used by enrollment grid section
 */
export function getSlotColorClasses(slotStatus: SlotDisplayStatus): StatusColorClasses {
  const participationStatus = mapSlotToParticipationStatus(slotStatus);
  return PARTICIPATION_STATUS_COLORS[participationStatus];
}
