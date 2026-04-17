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
  subheaderBg: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  descColor: string;
  sectionTitle: string;
  sectionIcon: string;
  sectionPillBg: string;
  sectionDivider: string;
  sectionCardBorder: string;
}

export const SLOT_COLOR_CLASSES: Record<SemanticColor, SlotColorClasses> = {
  success: {
    headerBg: 'bg-success-50 border-b border-success-200',
    subheaderBg: 'bg-success-50/60 border-b border-success-100',
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
    titleColor: 'text-success-800',
    descColor: 'text-success-600',
    sectionTitle: 'text-success-700',
    sectionIcon: 'text-success-500',
    sectionPillBg: 'bg-success-50 ring-1 ring-success-200',
    sectionDivider: 'border-success-200',
    sectionCardBorder: 'border-success-300',
  },
  warning: {
    headerBg: 'bg-warning-50 border-b border-warning-200',
    subheaderBg: 'bg-warning-50/60 border-b border-warning-100',
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
    titleColor: 'text-warning-800',
    descColor: 'text-warning-600',
    sectionTitle: 'text-warning-700',
    sectionIcon: 'text-warning-500',
    sectionPillBg: 'bg-warning-50 ring-1 ring-warning-200',
    sectionDivider: 'border-warning-200',
    sectionCardBorder: 'border-warning-300',
  },
  neutral: {
    headerBg: 'bg-neutral-100 border-b border-neutral-200',
    subheaderBg: 'bg-neutral-100/60 border-b border-neutral-100',
    iconBg: 'bg-neutral-200',
    iconColor: 'text-neutral-500',
    titleColor: 'text-neutral-700',
    descColor: 'text-neutral-500',
    sectionTitle: 'text-neutral-500',
    sectionIcon: 'text-neutral-400',
    sectionPillBg: 'bg-neutral-100 ring-1 ring-neutral-200',
    sectionDivider: 'border-neutral-200',
    sectionCardBorder: 'border-neutral-200',
  },
  primary: {
    headerBg: 'bg-primary-50 border-b border-primary-200',
    subheaderBg: 'bg-primary-50/60 border-b border-primary-100',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    titleColor: 'text-primary-800',
    descColor: 'text-primary-600',
    sectionTitle: 'text-primary-700',
    sectionIcon: 'text-primary-500',
    sectionPillBg: 'bg-primary-50 ring-1 ring-primary-200',
    sectionDivider: 'border-primary-200',
    sectionCardBorder: 'border-primary-300',
  },
  danger: {
    headerBg: 'bg-danger-50 border-b border-danger-200',
    subheaderBg: 'bg-danger-50/60 border-b border-danger-100',
    iconBg: 'bg-danger-100',
    iconColor: 'text-danger-600',
    titleColor: 'text-danger-800',
    descColor: 'text-danger-600',
    sectionTitle: 'text-danger-700',
    sectionIcon: 'text-danger-500',
    sectionPillBg: 'bg-danger-50 ring-1 ring-danger-200',
    sectionDivider: 'border-danger-200',
    sectionCardBorder: 'border-danger-300',
  },
  info: {
    headerBg: 'bg-info-50 border-b border-info-200',
    subheaderBg: 'bg-info-50/60 border-b border-info-100',
    iconBg: 'bg-info-100',
    iconColor: 'text-info-600',
    titleColor: 'text-info-800',
    descColor: 'text-info-600',
    sectionTitle: 'text-info-700',
    sectionIcon: 'text-info-500',
    sectionPillBg: 'bg-info-50 ring-1 ring-info-200',
    sectionDivider: 'border-info-200',
    sectionCardBorder: 'border-info-300',
  },
};

export interface SlotStatusConfig {
  title: string;
  description: string;
  icon: IconName;
  /** Semantic color name used to derive Tailwind classes */
  color: SemanticColor;
  /** Short note shown in the grid section header (section-level context) */
  sectionNote?: string;
  /** Anchor linking to the relevant FAQ entry */
  faqAnchor?: string;
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
    sectionNote:
      'Potwierdzeni uczestnicy z zarezerwowanym miejscem. Tylko oni biorą udział w tym wydarzeniu',
    faqAnchor: 'participant-status',
  },
  pending: {
    title: 'Oczekujący',
    description: 'Czeka na wolne miejsce lub zatwierdzenie przez organizatora',
    icon: 'clock',
    color: 'info',
    sectionNote: 'Osoby czekające na wolny slot lub wymagające zatwierdzenia przez organizatora',
    faqAnchor: 'pending-status',
  },
  withdrawn: {
    title: 'Wypisany',
    description: 'Zrezygnował z udziału lub został odrzucony',
    icon: 'user-x',
    color: 'danger',
    sectionNote:
      'Osoby, które zrezygnowały z udziału lub zostały odrzucone/zbanowane przez organizatora',
    faqAnchor: 'withdrawn-status',
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
