import {
  getSlotColorClasses as getSlotColorClassesFromConfig,
  SlotDisplayStatus,
  type StatusColorClasses,
} from '../utils/participation-status-colors';

export type SlotColorClasses = StatusColorClasses;

// Re-export for backward compatibility
export type { SlotDisplayStatus };

export interface SlotStatusConfig {
  title: string;
  description: string;
  /** Slot display status for color lookup */
  status: SlotDisplayStatus;
  /** Plural form of title used in section header */
  sectionHeader: string;
  /** Short note shown in the grid section header (section-level context) */
  sectionNote?: string;
  /** Anchor linking to the relevant FAQ entry */
  faqAnchor?: string;
}

/**
 * Returns enrollment grid color classes for a given slot display status
 * Uses participation-status-colors.ts as single source of truth
 */
export function getSlotColorClasses(slotStatus: SlotDisplayStatus): SlotColorClasses {
  return getSlotColorClassesFromConfig(slotStatus);
}

export const SLOT_STATUS_CONFIG: Record<SlotDisplayStatus, SlotStatusConfig> = {
  assigned: {
    title: 'Uczestnik',
    description: 'Ma potwierdzone miejsce w wydarzeniu',
    status: 'assigned',
    sectionHeader: 'Uczestnicy',
    sectionNote:
      'Potwierdzeni uczestnicy z zarezerwowanym miejscem. Tylko oni biorą udział w tym wydarzeniu',
    faqAnchor: 'participant-status',
  },
  pending: {
    title: 'Oczekujący',
    description: 'Oczekuje na wolne miejsce lub zatwierdzenie przez organizatora',
    status: 'pending',
    sectionHeader: 'Oczekujący',
    sectionNote:
      'Osoby oczekujące na wolne miejsce lub wymagające zatwierdzenia przez organizatora',
    faqAnchor: 'pending-status',
  },
  withdrawn: {
    title: 'Wypisany',
    description: 'Zrezygnował z udziału lub został odrzucony',
    status: 'withdrawn',
    sectionHeader: 'Wypisani',
    sectionNote:
      'Osoby, które zrezygnowały z udziału lub zostały odrzucone/zbanowane przez organizatora',
    faqAnchor: 'withdrawn-status',
  },
  free: {
    title: 'Wolne miejsce',
    description: 'Slot jest dostępny do zajęcia',
    status: 'free',
    sectionHeader: 'Wolne miejsca',
  },
  'non-participant': {
    title: 'Nie uczestniczy',
    description: 'Użytkownik nie bierze udziału w tym wydarzeniu',
    status: 'non-participant',
    sectionHeader: 'Nie uczestniczą',
  },
};
