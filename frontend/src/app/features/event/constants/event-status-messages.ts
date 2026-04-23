import { SemanticColor } from '../../../shared/types/colors';

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
