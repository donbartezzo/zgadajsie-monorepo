import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { BottomOverlayComponent } from '../../../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { SemanticColor } from '../../../../../shared/types/colors';
import {
  EVENT_STATUS_MESSAGES,
  EventLifecycleStatus,
  LIFECYCLE_STATUS_APPEARANCE,
  LIFECYCLE_STATUS_LABELS,
} from '../../../constants/event-status-messages';

interface StepConfig {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-event-status-bar-details-overlay',
  imports: [IconComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay
      [open]="open()"
      [icon]="headerIcon()"
      [iconColor]="headerIconColor()"
      [title]="headerTitle()"
      [description]="headerDescription()"
      (closed)="closed.emit()"
    >
      <div class="space-y-5">
        <!-- Current status summary -->
        <div [class]="'rounded-xl border p-4 ' + statusBorderClass() + ' ' + statusBgClass()">
          <p [class]="'text-sm font-semibold ' + statusTextClass()">
            {{ statusTitle() }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-neutral-500">
            {{ statusDescription() }}
          </p>
        </div>

        <!-- How enrollment works - step-by-step (UPCOMING only) -->
        @if (showSteps()) {
          <div>
            <h3 class="text-sm font-bold text-neutral-900 mb-3">Jak przebiegają zapisy?</h3>
            <ol class="relative ml-3 border-l-2 border-neutral-200 space-y-4">
              @for (step of steps(); track $index) {
                <li class="ml-4">
                  <span
                    class="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white bg-neutral-200"
                  >
                    <span class="text-[9px] font-bold text-neutral-400">
                      {{ $index + 1 }}
                    </span>
                  </span>
                  <p class="text-sm text-neutral-500">{{ step.label }}</p>
                </li>
              }
            </ol>
          </div>
        }

        <!-- How to join - instructions (UPCOMING only) -->
        @if (joinInstructions().length > 0) {
          <div>
            <h3 class="text-sm font-bold text-neutral-900 mb-2">Jak dołączyć?</h3>
            <ul class="space-y-2">
              @for (instr of joinInstructions(); track $index) {
                <li class="flex items-start gap-2.5">
                  <span
                    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-500"
                  >
                    {{ $index + 1 }}
                  </span>
                  <span class="text-xs leading-relaxed text-neutral-600">{{ instr }}</span>
                </li>
              }
            </ul>
          </div>
        }

        <!-- Important notes -->
        @if (importantNotes().length > 0) {
          <div class="rounded-lg border border-warning-200 bg-warning-50 p-3">
            <div class="flex items-start gap-2">
              <app-icon name="alert-triangle" size="sm" class="text-warning-500 mt-0.5 shrink-0" />
              <div>
                <p class="text-xs font-semibold text-warning-700">Ważne informacje</p>
                <ul class="mt-1 space-y-1">
                  @for (note of importantNotes(); track $index) {
                    <li class="text-xs leading-relaxed text-neutral-600">{{ note }}</li>
                  }
                </ul>
              </div>
            </div>
          </div>
        }
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBarDetailsOverlayComponent {
  // ── Inputs ──
  readonly open = input(false);
  readonly lifecycleStatus = input<EventLifecycleStatus>('UPCOMING');
  readonly participantCount = input(0);
  readonly maxParticipants = input(0);
  readonly costPerPerson = input(0);

  // ── Outputs ──
  readonly closed = output<void>();

  // ── Computed ──

  readonly headerIcon = computed(() => LIFECYCLE_STATUS_APPEARANCE[this.lifecycleStatus()].icon);

  readonly headerIconColor = computed<SemanticColor>(
    () => LIFECYCLE_STATUS_APPEARANCE[this.lifecycleStatus()].color,
  );

  readonly headerTitle = computed(() => LIFECYCLE_STATUS_LABELS[this.lifecycleStatus()].title);

  readonly headerDescription = computed(
    () => 'Szczegółowe informacje o statusie zapisów i procesie dołączania.',
  );

  readonly showSteps = computed(() => this.lifecycleStatus() === 'UPCOMING');

  readonly statusTitle = computed(() => LIFECYCLE_STATUS_LABELS[this.lifecycleStatus()].title);

  readonly statusDescription = computed(() => {
    const ls = this.lifecycleStatus();
    if (ls === 'CANCELLED') return EVENT_STATUS_MESSAGES.CANCELLED.description;
    if (ls === 'ENDED') return EVENT_STATUS_MESSAGES.ENDED.description;
    if (ls === 'ONGOING') return EVENT_STATUS_MESSAGES.ONGOING.description;

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
      { icon: 'check-circle', label: 'Poczekaj na zatwierdzenie przez organizatora' },
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
      'Naciśnij przycisk "Zapisz się" na karcie wydarzenia.',
      'Zapoznaj się z informacjami o wydarzeniu i potwierdź zgłoszenie.',
      'Poczekaj na zatwierdzenie przez organizatora lub automatyczne przydzielenie miejsca.',
    ];
    if (isPaid) {
      instructions.push('Po zatwierdzeniu opłać udział online lub gotówką.');
    }
    return instructions;
  });

  readonly importantNotes = computed<string[]>(() => {
    const ls = this.lifecycleStatus();
    if (ls === 'CANCELLED' || ls === 'ENDED') return [];

    const notes: string[] = [];

    if (ls === 'UPCOMING') {
      notes.push('Miejsca przydzielane są w kolejności zgłoszeń.');
      notes.push('Nowi użytkownicy mogą wymagać ręcznego zatwierdzenia przez organizatora.');
    }
    if (this.costPerPerson() > 0) {
      notes.push(`Koszt udziału: ${this.costPerPerson()} zł. Płatność wymagana po zatwierdzeniu.`);
    }

    return notes;
  });
}
