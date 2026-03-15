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
    <app-bottom-overlay
      [open]="open()"
      icon="list"
      iconVariant="info"
      title="Chcesz dołączyć?"
      description="Zapoznaj się z poniższymi danymi i organizacją tego wydarzenia."
      (closed)="closed.emit()"
    >
      @let _event = event(); @if (_event) {
      <div class="space-y-4">
        <!-- Event details -->
        <div>
          <h3 class="font-bold text-neutral-900 mb-2">
            Szczegóły wydarzenia i kryteria uczestnictwa:
          </h3>
          <app-event-criteria-description [event]="_event"></app-event-criteria-description>
        </div>

        <!-- Rules -->
        @if (rulesList().length > 0) {
        <div>
          <h3 class="font-bold text-neutral-900 mb-2">
            Zasady ogólne wyznaczone przez organizatora:
          </h3>
          <ol class="list-decimal list-inside space-y-1.5 text-sm text-neutral-600">
            @for (rule of rulesList(); track $index) {
            <li>{{ rule }}</li>
            }
          </ol>
        </div>
        }

        <!-- Organizer info -->
        @if (isOrganizer() && _event.costPerPerson > 0) {
        <div class="rounded-lg border border-info-200 bg-info-50 p-3">
          <div class="flex items-start gap-3">
            <app-icon name="shield" size="sm" class="text-info-400 mt-0.5"></app-icon>
            <div>
              <p class="text-sm font-semibold text-info-700">
                Jesteś organizatorem tego wydarzenia
              </p>
              <p class="mt-1 text-xs text-info-600">
                Jako organizator automatycznie dostaniesz status"Zaakceptowano" i nie musisz płacić
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
            (rulesAccepted() ? 'border-success-200 bg-success-50' : 'border-neutral-200')
          "
        >
          <input
            type="checkbox"
            class="h-5 w-5 shrink-0 rounded border-neutral-300 text-primary-500 accent-highlight cursor-pointer"
            [checked]="rulesAccepted()"
            (change)="rulesAccepted.set(!rulesAccepted())"
          />
          <span class="text-sm text-neutral-700">
            Oświadczam, że zapoznałem się z powyższymi informacjami i spełniam kryteria uczestnictwa
            @if (rulesList().length > 0) { oraz akceptuję wyznaczone zasady }
          </span>
        </label>

        <!-- Action -->
        <div class="mt-3 max-w-lg mx-auto">
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
