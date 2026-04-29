import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { BottomOverlayComponent } from '../../../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { SemanticColor } from '../../../../../shared/types/colors';
import {
  EVENT_LIFECYCLE_CONFIG,
  EventLifecycleStatus,
} from '../../../constants/event-status-messages';

interface StepConfig {
  icon: string;
  label: string;
}

interface StatusInfoConfig {
  allowed: string[];
  blocked: string[];
  contactSection?: { title: string; steps: string[] };
  tip?: string;
}

@Component({
  selector: 'app-event-status-bar-details-overlay',
  imports: [IconComponent, BottomOverlayComponent, ButtonComponent],
  templateUrl: './event-status-bar-details-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBarDetailsOverlayComponent {
  // ── Inputs ──
  readonly open = input(false);
  readonly lifecycleStatus = input<EventLifecycleStatus>('UPCOMING');
  readonly participantCount = input(0);
  readonly maxParticipants = input(0);
  readonly costPerPerson = input(0);
  readonly actionButton = input<{ label: string; color?: SemanticColor } | undefined>(undefined);

  // ── Outputs ──
  readonly closed = output<void>();
  readonly actionClicked = output<void>();

  // ── Computed ──

  readonly headerTitle = computed(() => EVENT_LIFECYCLE_CONFIG[this.lifecycleStatus()].title);

  readonly showSteps = computed(() => this.lifecycleStatus() === 'UPCOMING');

  readonly statusDescription = computed(() => {
    const ls = this.lifecycleStatus();
    if (ls !== 'UPCOMING') return EVENT_LIFECYCLE_CONFIG[ls].description ?? '';

    const max = this.maxParticipants();
    const count = this.participantCount();
    const freeSlots = Math.max(0, max - count);
    if (freeSlots > 0) {
      return `Zapisy są otwarte. Wolne miejsca: ${freeSlots} z ${max}. Zapisz się teraz!`;
    }
    return 'Zapisy są otwarte, ale wszystkie miejsca zostały zajęte. Możesz zapisać się na listę oczekujących.';
  });

  readonly statusBorderClass = computed(() => {
    const ls = this.lifecycleStatus();
    if (ls === 'CANCELLED') return 'border-danger-200';
    if (ls === 'ENDED') return 'border-neutral-200';
    if (ls === 'ONGOING') return 'border-success-200';
    return 'border-primary-200';
  });

  readonly statusBgClass = computed(() => {
    const ls = this.lifecycleStatus();
    if (ls === 'CANCELLED') return 'bg-danger-50';
    if (ls === 'ENDED') return 'bg-neutral-50';
    if (ls === 'ONGOING') return 'bg-success-50';
    return 'bg-primary-50';
  });

  readonly statusTextClass = computed(() => {
    const ls = this.lifecycleStatus();
    if (ls === 'CANCELLED') return 'text-danger-700';
    if (ls === 'ENDED') return 'text-neutral-700';
    if (ls === 'ONGOING') return 'text-success-700';
    return 'text-primary-700';
  });

  readonly steps = computed<StepConfig[]>(() => {
    if (this.lifecycleStatus() !== 'UPCOMING') return [];
    const isPaid = this.costPerPerson() > 0;

    const result: StepConfig[] = [
      { icon: 'edit', label: 'Zapisz się na wydarzenie' },
      {
        icon: 'check-circle',
        label:
          'Poczekaj na zatwierdzenie przez organizatora lub automatyczne przydzielenie miejsca',
      },
    ];

    if (isPaid) {
      result.push({ icon: 'dollar-sign', label: 'Opłać udział' });
    }

    result.push({ icon: 'calendar', label: 'Weź udział w wydarzeniu' });
    return result;
  });

  readonly joinInstructions = computed<string[]>(() => {
    if (this.lifecycleStatus() !== 'UPCOMING') return [];
    const isPaid = this.costPerPerson() > 0;

    const instructions = [
      'Naciśnij przycisk "Zapisz się" (powyżej lub na karcie wydarzenia).',
      'Zapoznaj się z informacjami o wydarzeniu i potwierdź zgłoszenie.',
      'Poczekaj na zatwierdzenie przez organizatora, wolne miejsce lub automatyczny przydział.',
    ];
    if (isPaid) {
      instructions.push('Po zatwierdzeniu opłać udział online lub gotówką.');
    }
    return instructions;
  });

  readonly importantNotes = computed<string[]>(() => {
    if (this.lifecycleStatus() !== 'UPCOMING') return [];

    const notes: string[] = [
      'Miejsca przydzielane są w kolejności zgłoszeń.',
      'Nowi użytkownicy mogą wymagać ręcznego zatwierdzenia przez organizatora.',
    ];

    if (this.costPerPerson() > 0) {
      notes.push(`Koszt udziału: ${this.costPerPerson()} zł. Płatność wymagana po zatwierdzeniu.`);
    }

    return notes;
  });

  readonly statusInfo = computed<StatusInfoConfig>(() => {
    const ls = this.lifecycleStatus();

    const contactSection = {
      title: 'Chcesz wziąć udział w kolejnej edycji?',
      steps: [
        'Przejdź do profilu organizatora i wyślij mu wiadomość z zapytaniem.',
        'Zapytaj o planowane przyszłe edycje tego wydarzenia.',
        'Obserwuj organizatora, aby nie przegapić nowych ogłoszeń.',
      ],
    };

    if (ls === 'ONGOING') {
      return {
        allowed: ['Tylko uczestnicy zapisani na to wydarzenie biorą w nim udział.'],
        blocked: ['Nowe zapisy nie są możliwe.', 'Lista oczekujących jest niedostępna.'],
        tip: 'Sprawdź inne nadchodzące wydarzenia, aby dołączyć do kolejnych aktywności.',
        contactSection,
      };
    }

    if (ls === 'ENDED') {
      return {
        allowed: [],
        blocked: ['Zapisy są trwale zamknięte.', 'Nie można dołączyć do zakończonego wydarzenia.'],
        contactSection,
      };
    }

    if (ls === 'CANCELLED') {
      return {
        allowed: [],
        blocked: [
          'Zapisy są trwale zamknięte.',
          'Udział w tym wydarzeniu nie jest możliwy.',
          'Wszystkie dotychczasowe zapisy zostały anulowane - nikt nie bierze w nim udziału.',
          'Zazwyczaj w opisie wydarzenia podany jest powód odwołania - jeśli brak to skontaktuj się z organizatorem w celu wyjaśnienia.',
        ],
        contactSection,
      };
    }

    return { allowed: [], blocked: [] };
  });
}
