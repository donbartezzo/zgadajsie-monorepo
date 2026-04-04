import { IconName } from '../ui/icon/icon.component';

export type SlotDisplayStatus = 'participant' | 'pending' | 'withdrawn' | 'free';

export interface SlotStatusConfig {
  title: string;
  description: string;
  icon: IconName;
  /** Semantic color name used to derive Tailwind classes */
  color: 'primary' | 'success' | 'warning' | 'neutral' | 'danger';
}

export const SLOT_STATUS_CONFIG: Record<SlotDisplayStatus, SlotStatusConfig> = {
  participant: {
    title: 'Uczestnik',
    description: 'Ma potwierdzone miejsce w wydarzeniu',
    icon: 'check-circle',
    color: 'success',
  },
  pending: {
    title: 'Oczekujący',
    description: 'Czeka na wolne miejsce lub zatwierdzenie przez organizatora',
    icon: 'clock',
    color: 'warning',
  },
  withdrawn: {
    title: 'Wypisany',
    description: 'Zrezygnował z udziału lub został odrzucony',
    icon: 'user-x',
    color: 'neutral',
  },
  free: {
    title: 'Wolne miejsce',
    description: 'Slot jest dostępny do zajęcia',
    icon: 'plus',
    color: 'primary',
  },
};
