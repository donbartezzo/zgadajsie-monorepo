import { IconName } from '../ui/icon/icon.component';
import { type SemanticColor } from '../types/colors';

export type SlotDisplayStatus =
  | 'participant'
  | 'pending'
  | 'withdrawn'
  | 'free'
  | 'non-participant';

export interface SlotColorClasses {
  headerBg: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  descColor: string;
  sectionTitle: string;
  sectionIcon: string;
}

export const SLOT_COLOR_CLASSES: Record<SemanticColor, SlotColorClasses> = {
  success: {
    headerBg: 'bg-success-50 border-b border-success-200',
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
    titleColor: 'text-success-800',
    descColor: 'text-success-600',
    sectionTitle: 'text-success-700',
    sectionIcon: 'text-success-500',
  },
  warning: {
    headerBg: 'bg-warning-50 border-b border-warning-200',
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
    titleColor: 'text-warning-800',
    descColor: 'text-warning-600',
    sectionTitle: 'text-warning-700',
    sectionIcon: 'text-warning-500',
  },
  neutral: {
    headerBg: 'bg-neutral-100 border-b border-neutral-200',
    iconBg: 'bg-neutral-200',
    iconColor: 'text-neutral-500',
    titleColor: 'text-neutral-700',
    descColor: 'text-neutral-500',
    sectionTitle: 'text-neutral-500',
    sectionIcon: 'text-neutral-400',
  },
  primary: {
    headerBg: 'bg-primary-50 border-b border-primary-200',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    titleColor: 'text-primary-800',
    descColor: 'text-primary-600',
    sectionTitle: 'text-primary-700',
    sectionIcon: 'text-primary-500',
  },
  danger: {
    headerBg: 'bg-danger-50 border-b border-danger-200',
    iconBg: 'bg-danger-100',
    iconColor: 'text-danger-600',
    titleColor: 'text-danger-800',
    descColor: 'text-danger-600',
    sectionTitle: 'text-danger-700',
    sectionIcon: 'text-danger-500',
  },
  info: {
    headerBg: 'bg-info-50 border-b border-info-200',
    iconBg: 'bg-info-100',
    iconColor: 'text-info-600',
    titleColor: 'text-info-800',
    descColor: 'text-info-600',
    sectionTitle: 'text-info-700',
    sectionIcon: 'text-info-500',
  },
};

export interface SlotStatusConfig {
  title: string;
  description: string;
  icon: IconName;
  /** Semantic color name used to derive Tailwind classes */
  color: SemanticColor;
}

export function getSlotColorClasses(config: SlotStatusConfig): SlotColorClasses {
  return SLOT_COLOR_CLASSES[config.color];
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
    color: 'info',
  },
  withdrawn: {
    title: 'Wypisany',
    description: 'Zrezygnował z udziału lub został odrzucony',
    icon: 'user-x',
    color: 'danger',
  },
  free: {
    title: 'Wolne miejsce',
    description: 'Slot jest dostępny do zajęcia',
    icon: 'plus',
    color: 'primary',
  },
  'non-participant': {
    title: 'Nie uczestniczy',
    description: 'Użytkownik nie bierze udziału w tym wydarzeniu',
    icon: 'user',
    color: 'neutral',
  },
};
