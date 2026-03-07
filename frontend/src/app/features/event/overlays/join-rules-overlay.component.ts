import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { Event as EventModel } from '../../../shared/types';
import { EventCriteriaDescriptionComponent } from '../ui/event-criteria-description/event-criteria-description.component';

@Component({
  selector: 'app-join-rules-overlay',
  imports: [
    IconComponent,
    ButtonComponent,
    BottomOverlayComponent,
    EventCriteriaDescriptionComponent,
  ],
  template: `
    <app-bottom-overlay [open]="open()" (closed)="closed.emit()">
      @let _event = event(); @if (_event) {
      <div class="space-y-4">
        <!-- Header -->
        <div class="text-center">
          <div
            class="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
          >
            <app-icon name="list" size="lg" class="text-blue-500 dark:text-blue-400"></app-icon>
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Chcesz dołączyć?</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Zapoznaj się z poniższymi danymi i organizacją tego wydarzenia.
          </p>
        </div>

        <!-- Event details -->
        <div>
          <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-2">
            Szczegóły wydarzenia i kryteria uczestnictwa:
          </h3>
          <app-event-criteria-description [event]="_event"></app-event-criteria-description>
        </div>

        <!-- Rules -->
        @if (rulesList().length > 0) {
        <div>
          <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-2">
            Zasady ogólne wyznaczone przez organizatora:
          </h3>
          <ol class="list-decimal list-inside space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            @for (rule of rulesList(); track $index) {
            <li>{{ rule }}</li>
            }
          </ol>
        </div>
        }

        <!-- Organizer info -->
        @if (isOrganizer() && _event.costPerPerson > 0) {
        <div
          class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20"
        >
          <div class="flex items-start gap-3">
            <app-icon
              name="shield"
              size="sm"
              class="text-blue-600 dark:text-blue-400 mt-0.5"
            ></app-icon>
            <div>
              <p class="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Jesteś organizatorem tego wydarzenia
              </p>
              <p class="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Jako organizator automatycznie dostaniesz status "Zaakceptowano" i nie musisz płacić
                za udział.
              </p>
            </div>
          </div>
        </div>
        }

        <!-- Checkbox -->
        <label
          [class]="
            'flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition-colors ' +
            (rulesAccepted()
              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-slate-600')
          "
        >
          <input
            type="checkbox"
            class="h-5 w-5 shrink-0 rounded border-gray-300 text-highlight accent-highlight cursor-pointer"
            [checked]="rulesAccepted()"
            (change)="rulesAccepted.set(!rulesAccepted())"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Oświadczam, że zapoznałem się z powyższymi informacjami i spełniam kryteria uczestnictwa
            @if (rulesList().length > 0) { oraz akceptuję wyznaczone zasady }
          </span>
        </label>

        <!-- Action -->
        <div class="mt-3">
          <app-button
            variant="primary"
            [fullWidth]="true"
            [loading]="loading()"
            [disabled]="!canJoin()"
            (clicked)="confirmed.emit()"
          >
            <app-icon name="check" size="sm"></app-icon>
            Zgłoś chęć udziału
          </app-button>
        </div>
      </div>
      }
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesOverlayComponent {
  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly loading = input(false);
  readonly isOrganizer = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  readonly rulesAccepted = signal(false);

  readonly rulesList = computed(() => {
    const rules = this.event()?.rules;
    if (!rules) return [];
    return rules
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
  });

  readonly canJoin = computed(() => {
    return this.rulesAccepted();
  });
}
