import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PRE_ENROLLMENT_HOURS, EventTimeStatus } from '@zgadajsie/shared';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { SemanticColor } from '../../../shared/types/colors';
import { EnrollmentPhase } from '../../../shared/types/event.interface';
import { getLotteryThreshold } from '../../../shared/utils/enrollment-phase.util';
import { EventCountdown } from '../../../shared/utils/date.utils';

interface StepConfig {
  icon: string;
  label: string;
  active: boolean;
  done: boolean;
}

@Component({
  selector: 'app-enrollment-details-overlay',
  imports: [IconComponent, BottomOverlayComponent, DatePipe],
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
          @if (showLotteryDate()) {
            <p class="mt-2 text-xs font-medium text-info-600">
              Zapisy wstępne kończą się:
              <strong>{{ lotteryDate() | date: "dd.MM.yyyy 'o godz.' HH:mm" }}</strong>
            </p>
          }
          @if (showParticipantCount()) {
            <p class="mt-1 text-xs font-medium text-neutral-600">
              Zgłoszonych: {{ participantCount() }}
            </p>
          }

          <!-- Lottery countdown (only in PRE_ENROLLMENT) -->
          @if (lotteryCountdown(); as lcd) {
            <div class="grid grid-cols-4 gap-2 text-center mt-3">
              <div>
                <span class="block text-2xl font-extrabold text-info-600">{{ lcd.days }}</span>
                <span class="block text-[10px] text-neutral-400">dni</span>
              </div>
              <div>
                <span class="block text-2xl font-extrabold text-info-600">{{ lcd.hours }}</span>
                <span class="block text-[10px] text-neutral-400">godzin</span>
              </div>
              <div>
                <span class="block text-2xl font-extrabold text-info-600">{{ lcd.minutes }}</span>
                <span class="block text-[10px] text-neutral-400">minut</span>
              </div>
              <div>
                <span class="block text-2xl font-extrabold text-info-600">{{ lcd.seconds }}</span>
                <span class="block text-[10px] text-neutral-400">sekund</span>
              </div>
            </div>
          }
        </div>

        <!-- How enrollment works - step-by-step -->
        @if (showSteps()) {
          <div>
            <h3 class="text-sm font-bold text-neutral-900 mb-3">Jak przebiegają zapisy?</h3>
            <ol class="relative ml-3 border-l-2 border-neutral-200 space-y-4">
              @for (step of steps(); track $index) {
                <li class="ml-4">
                  <span
                    [class]="
                      'absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ' +
                      (step.done
                        ? 'bg-success-400'
                        : step.active
                          ? 'bg-primary-500'
                          : 'bg-neutral-200')
                    "
                  >
                    @if (step.done) {
                      <app-icon name="check" size="xs" class="text-white" />
                    } @else {
                      <span
                        [class]="
                          'text-[9px] font-bold ' +
                          (step.active ? 'text-white' : 'text-neutral-400')
                        "
                      >
                        {{ $index + 1 }}
                      </span>
                    }
                  </span>
                  <p
                    [class]="
                      'text-sm ' +
                      (step.active
                        ? 'font-semibold text-neutral-900'
                        : step.done
                          ? 'text-neutral-400 line-through'
                          : 'text-neutral-500')
                    "
                  >
                    {{ step.label }}
                  </p>
                </li>
              }
            </ol>
          </div>
        }

        <!-- How to join - instructions -->
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
export class EnrollmentDetailsOverlayComponent {
  // ── Inputs ──
  readonly open = input(false);
  readonly enrollmentPhase = input<EnrollmentPhase | null>(null);
  readonly eventTimeStatus = input<EventTimeStatus | null>(null);
  readonly isCancelled = input(false);
  readonly startsAt = input<string>('');
  readonly participantCount = input(0);
  readonly maxParticipants = input(0);
  readonly costPerPerson = input(0);
  readonly lotteryCountdown = input<EventCountdown | null>(null);

  // ── Outputs ──
  readonly closed = output<void>();

  // ── Computed ──
  readonly lotteryDate = computed(() => {
    const s = this.startsAt();
    if (!s) return null;
    return getLotteryThreshold(s);
  });

  readonly showLotteryDate = computed(() => {
    const phase = this.enrollmentPhase();
    return phase === 'PRE_ENROLLMENT' && !!this.lotteryDate();
  });

  readonly showParticipantCount = computed(() => {
    const phase = this.enrollmentPhase();
    return phase === 'PRE_ENROLLMENT' && this.participantCount() > 0;
  });

  readonly showSteps = computed(() => {
    const phase = this.enrollmentPhase();
    const ts = this.eventTimeStatus();
    return !!phase && ts !== 'ENDED' && ts !== 'ONGOING' && !this.isCancelled();
  });

  readonly headerIcon = computed(() => {
    if (this.isCancelled()) return 'x';
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'clock';
    if (ts === 'ONGOING') return 'clock';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'users';
    if (phase === 'LOTTERY_PENDING') return 'loader';
    return 'check-circle';
  });

  readonly headerIconColor = computed<SemanticColor>(() => {
    if (this.isCancelled()) return 'danger' as const;
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'info' as const;
    if (ts === 'ONGOING') return 'success' as const;
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'info' as const;
    if (phase === 'LOTTERY_PENDING') return 'warning' as const;
    return 'success' as const;
  });

  readonly headerTitle = computed(() => {
    if (this.isCancelled()) return 'Wydarzenie odwołane';
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'Wydarzenie zakończone';
    if (ts === 'ONGOING') return 'Wydarzenie w trakcie';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'Wstępne zapisy';
    if (phase === 'LOTTERY_PENDING') return 'Losowanie w toku';
    return 'Zapisy otwarte';
  });

  readonly headerDescription = computed(
    () => 'Szczegółowe informacje o statusie zapisów i procesie dołączania.',
  );

  readonly statusTitle = computed(() => {
    if (this.isCancelled()) return 'Wydarzenie zostało odwołane';
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'Wydarzenie już się odbyło';
    if (ts === 'ONGOING') return 'Wydarzenie jest w trakcie';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'Trwają wstępne zapisy';
    if (phase === 'LOTTERY_PENDING') return 'Losowanie trwa';
    return 'Zapisy otwarte';
  });

  readonly statusDescription = computed(() => {
    if (this.isCancelled()) {
      return 'Organizator odwołał to wydarzenie. Zapisy zostały zamknięte. Jeśli byłeś zgłoszony, sprawdź swoje powiadomienia.';
    }
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') {
      return 'To wydarzenie już się odbyło. Nie można już dołączyć ani się zapisać.';
    }
    if (ts === 'ONGOING') {
      return 'Wydarzenie jest w trakcie. Nowe zapisy nie są możliwe.';
    }
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') {
      return (
        `W tej fazie możesz zgłosić chęć udziału. Przydział miejsc odbywa się automatycznie ok. ${PRE_ENROLLMENT_HOURS} godz. przed rozpoczęciem wydarzenia: ` +
        `jeśli zgłoszonych osób będzie więcej niż dostępnych miejsc, odbędzie się losowanie; w przeciwnym razie wszyscy zgłoszeni otrzymają miejsca.`
      );
    }
    if (phase === 'LOTTERY_PENDING') {
      return (
        'Wstępne zapisy zostały zakończone. Trwa automatyczne losowanie miejsc. ' +
        'Wyniki pojawią się wkrótce.'
      );
    }
    const max = this.maxParticipants();
    const count = this.participantCount();
    const freeSlots = Math.max(0, max - count);
    if (freeSlots > 0) {
      return `Zapisy są otwarte. Wolne miejsca: ${freeSlots} z ${max}. Dołącz teraz!`;
    }
    return 'Zapisy są otwarte, ale wszystkie miejsca zostały zajęte. Możesz zapisać się na listę oczekujących.';
  });

  readonly statusBorderClass = computed(() => {
    if (this.isCancelled()) return 'border-danger-200';
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'border-neutral-200';
    if (ts === 'ONGOING') return 'border-success-200';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'border-info-200';
    if (phase === 'LOTTERY_PENDING') return 'border-warning-200';
    return 'border-success-200';
  });

  readonly statusBgClass = computed(() => {
    if (this.isCancelled()) return 'bg-danger-50';
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'bg-neutral-50';
    if (ts === 'ONGOING') return 'bg-success-50';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'bg-info-50';
    if (phase === 'LOTTERY_PENDING') return 'bg-warning-50';
    return 'bg-success-50';
  });

  readonly statusTextClass = computed(() => {
    if (this.isCancelled()) return 'text-danger-700';
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') return 'text-neutral-700';
    if (ts === 'ONGOING') return 'text-success-700';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'text-info-700';
    if (phase === 'LOTTERY_PENDING') return 'text-warning-700';
    return 'text-success-700';
  });

  readonly steps = computed<StepConfig[]>(() => {
    const phase = this.enrollmentPhase();
    if (!phase) return [];

    const isPre = phase === 'PRE_ENROLLMENT';
    const isLottery = phase === 'LOTTERY_PENDING';
    const isOpen = phase === 'OPEN_ENROLLMENT';
    const isPaid = this.costPerPerson() > 0;

    const result: StepConfig[] = [
      {
        icon: 'edit',
        label: 'Wstępne zapisy - zgłoś chęć udziału',
        active: isPre,
        done: isLottery || isOpen,
      },
      {
        icon: 'shuffle',
        label: `Losowanie miejsc - ok. ${PRE_ENROLLMENT_HOURS} godz. przed startem wydarzenia`,
        active: isLottery,
        done: isOpen,
      },
      {
        icon: 'check-circle',
        label: 'Zapisy otwarte - wolne miejsca dostępne od ręki',
        active: isOpen,
        done: false,
      },
    ];

    if (isPaid) {
      result.push({
        icon: 'dollar-sign',
        label: 'Opłata - potwierdź udział dokonując płatności',
        active: false,
        done: false,
      });
    }

    return result;
  });

  readonly joinInstructions = computed<string[]>(() => {
    if (this.isCancelled()) {
      return ['Wydarzenie zostało odwołane - dołączenie nie jest możliwe.'];
    }
    const ts = this.eventTimeStatus();
    if (ts === 'ENDED' || ts === 'ONGOING') {
      return ['Zapisywanie nie jest możliwe po rozpoczęciu wydarzenia.'];
    }

    const phase = this.enrollmentPhase();
    const isPaid = this.costPerPerson() > 0;

    if (phase === 'PRE_ENROLLMENT') {
      const instructions = [
        'Naciśnij przycisk "Zgłoś się wstępnie" na karcie wydarzenia.',
        'Zapoznaj się z informacjami o wydarzeniu i potwierdź zgłoszenie.',
        'Poczekaj na losowanie - otrzymasz powiadomienie o wyniku.',
      ];
      if (isPaid) {
        instructions.push('Jeśli zostaniesz wylosowany, opłać udział w wyznaczonym terminie.');
      }
      return instructions;
    }
    if (phase === 'LOTTERY_PENDING') {
      return [
        'Losowanie jest w trakcie - poczekaj na wyniki.',
        'Otrzymasz powiadomienie push/email z informacją o wyniku.',
        'Jeśli nie zostaniesz wylosowany, będziesz mógł dołączyć w fazie otwartych zapisów (jeśli pozostaną wolne miejsca).',
      ];
    }
    if (phase === 'OPEN_ENROLLMENT') {
      const instructions = [
        'Naciśnij przycisk "Dołącz do wydarzenia" na karcie wydarzenia.',
        'Zapoznaj się z informacjami o wydarzeniu i potwierdź zgłoszenie.',
        'Jeśli brałeś już udział w wydarzeniach tego organizatora - zostaniesz zatwierdzony automatycznie. W przeciwnym razie organizator zatwierdzi Twój udział ręcznie.',
      ];
      if (isPaid) {
        instructions.push('Po zatwierdzeniu opłać udział online lub gotówką.');
      }
      return instructions;
    }

    return [];
  });

  readonly importantNotes = computed<string[]>(() => {
    if (this.isCancelled() || this.eventTimeStatus() === 'ENDED') return [];

    const phase = this.enrollmentPhase();
    const notes: string[] = [];

    if (phase === 'PRE_ENROLLMENT') {
      notes.push('Zgłoszenie wstępne nie gwarantuje miejsca - o przydziale decyduje losowanie.');
      notes.push('Lista uczestników jest ukryta do czasu zakończenia losowania.');
      notes.push(
        `Losowanie i otwarcie zapisów następuje zawsze ok. ${PRE_ENROLLMENT_HOURS} godz. przed startem wydarzenia.`,
      );
    }
    if (phase === 'LOTTERY_PENDING') {
      notes.push('Nie możesz w tej chwili zapisać się na wydarzenie.');
      notes.push('Wyniki losowania pojawią się automatycznie.');
    }
    if (phase === 'OPEN_ENROLLMENT') {
      notes.push('Miejsca przydzielane są w kolejności zgłoszeń.');
      notes.push('Nowi użytkownicy mogą wymagać ręcznego zatwierdzenia przez organizatora.');
    }
    if (this.costPerPerson() > 0) {
      notes.push(`Koszt udziału: ${this.costPerPerson()} zł. Płatność wymagana po zatwierdzeniu.`);
    }

    return notes;
  });
}
