import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import {
  BottomOverlayComponent,
  OverlayIconVariant,
} from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { Event as EventModel } from '../../../shared/types';

@Component({
  selector: 'app-join-confirm-overlay',
  imports: [IconComponent, ButtonComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay
      [open]="open()"
      [icon]="headerIcon()"
      [iconVariant]="headerIconVariant()"
      [title]="headerTitle()"
      [description]="headerDescription()"
      (closed)="closed.emit()"
    >
      @let _event = event();
      <div class="space-y-4 max-w-lg mx-auto">
        <!-- Event info row -->
        <div class="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
          <div class="flex justify-center gap-5 text-center">
            <div>
              <app-icon name="calendar" size="sm" variant="primary"></app-icon>
              <p class="mt-1 text-xs font-semibold text-neutral-900">
                {{ startDateFormatted() }}
              </p>
            </div>
            <div>
              <app-icon name="clock" size="sm" variant="muted"></app-icon>
              <p class="mt-1 text-xs font-semibold text-neutral-900">
                {{ startTimeFormatted() }}–{{ endTimeFormatted() }}
              </p>
            </div>
            <div>
              <app-icon name="map-pin" size="sm" variant="danger"></app-icon>
              <p class="mt-1 text-xs font-semibold text-neutral-900 max-w-[100px] truncate">
                {{ address() || 'Brak' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Payment CTA (highlighted) -->
        @if (needsPayment()) {
        <div class="rounded-xl border-2 border-warning-200 bg-warning-50 p-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-50"
            >
              <app-icon name="dollar-sign" size="md" class="text-warning-400"></app-icon>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-warning-400">Wymagana płatność</p>
              <p class="text-xs text-warning-400 mt-0.5">
                Opłać {{ _event?.costPerPerson }} zł, aby potwierdzić swój udział.
              </p>
            </div>
          </div>
          <app-button
            variant="primary"
            [fullWidth]="true"
            [loading]="loading()"
            (clicked)="payRequested.emit()"
            class="block mt-3"
          >
            <app-icon name="dollar-sign" size="sm"></app-icon>
            Opłać udział
          </app-button>
        </div>
        }

        <!-- Participant options -->
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
            Opcje uczestnika
          </p>
          <div class="space-y-2">
            <!-- Event chat -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left transition-colors hover:bg-neutral-50"
              (click)="openChat.emit()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-50"
              >
                <app-icon name="message-circle" size="sm" class="text-info-400"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Czat wydarzenia</p>
                <p class="text-xs text-neutral-400">Porozmawiaj z uczestnikami</p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>

            <!-- Contact organizer -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left transition-colors hover:bg-neutral-50"
              (click)="contactOrganizer.emit()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-50"
              >
                <app-icon name="user" size="sm" class="text-info-300"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Napisz do organizatora</p>
                <p class="text-xs text-neutral-400">
                  {{ _event?.organizer?.displayName || 'Organizator' }}
                </p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>

            <!-- Leave -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-danger-50 bg-white p-3 text-left transition-colors hover:bg-danger-500"
              (click)="leaveRequested.emit()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50"
              >
                <app-icon name="user-x" size="sm" class="text-danger-300"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-danger-400">Wypisz się z wydarzenia</p>
                <p class="text-xs text-neutral-400">Stracisz swoje miejsce</p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>
          </div>
        </div>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinConfirmOverlayComponent {
  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly loading = input(false);
  readonly participantStatus = input<string | null>(null);

  readonly closed = output<void>();
  readonly openChat = output<void>();
  readonly payRequested = output<void>();
  readonly contactOrganizer = output<void>();
  readonly leaveRequested = output<void>();

  readonly headerIcon = computed<IconName>(() => {
    const s = this.participantStatus();
    if (s === 'PENDING') return 'clock';
    if (s === 'APPROVED') return 'check';
    return 'check-circle';
  });

  readonly headerIconVariant = computed<OverlayIconVariant>(() => {
    const s = this.participantStatus();
    if (s === 'PENDING') return 'warning';
    if (s === 'APPROVED') return 'info';
    return 'success';
  });

  readonly headerTitle = computed(() => {
    const status = this.participantStatus();
    if (status === 'PENDING') return 'Zgłoszenie wysłane!';
    if (status === 'APPROVED') return 'Zatwierdzone - potwierdź udział!';
    if (status === 'CONFIRMED') return 'Jesteś potwierdzonym uczestnikiem!';
    return 'Zgłoszenie wysłane!';
  });

  readonly headerDescription = computed(() => {
    const status = this.participantStatus();
    if (status === 'PENDING') {
      return 'Twoje zgłoszenie oczekuje na losowanie lub akceptację organizatora.';
    }
    if (status === 'APPROVED') {
      return 'Twoje miejsce zostało przyznane. Potwierdź uczestnictwo.';
    }
    return 'Twój udział jest potwierdzony. Do zobaczenia!';
  });

  readonly address = computed(() => this.event()?.address || '');

  readonly needsPayment = computed(() => {
    const status = this.participantStatus();
    const cost = this.event()?.costPerPerson ?? 0;
    return status === 'APPROVED' && cost > 0;
  });

  readonly startDateFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  });

  readonly startTimeFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  });

  readonly endTimeFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.endsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  });
}
