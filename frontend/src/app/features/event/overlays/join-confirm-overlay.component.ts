import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { SemanticColor } from '../../../shared/types/colors';
import {
  Event as EventModel,
  WaitingReason,
  ParticipationStatus,
  Participation,
} from '../../../shared/types';
import {
  getParticipationStatusDescription,
  ParticipationStatusOptions,
} from '../../../shared/utils';

@Component({
  selector: 'app-join-confirm-overlay',
  imports: [IconComponent, ButtonComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay
      [open]="open()"
      [icon]="headerIcon()"
      [iconColor]="headerIconColor()"
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
              <app-icon name="calendar" size="sm" color="primary"></app-icon>
              <p class="mt-1 text-xs font-semibold text-neutral-900">
                {{ startDateFormatted() }}
              </p>
            </div>
            <div>
              <app-icon name="clock" size="sm" color="neutral" muted="light"></app-icon>
              <p class="mt-1 text-xs font-semibold text-neutral-900">
                {{ startTimeFormatted() }}–{{ endTimeFormatted() }}
              </p>
            </div>
            <div>
              <app-icon name="map-pin" size="sm" color="danger"></app-icon>
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
            appearance="soft"
            color="primary"
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

        <!-- Rejoin CTA for withdrawn users -->
        @if (isWithdrawnOrRejected() && canRejoin()) {
        <div class="rounded-xl border-2 border-primary-200 bg-primary-50 p-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100"
            >
              <app-icon name="user-plus" size="md" class="text-primary-500"></app-icon>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-primary-600">Chcesz wrócić?</p>
              <p class="text-xs text-primary-500 mt-0.5">
                Możesz ponownie dołączyć do tego wydarzenia.
              </p>
            </div>
          </div>
          <app-button
            appearance="soft"
            color="primary"
            [fullWidth]="true"
            [loading]="loading()"
            (clicked)="rejoinRequested.emit()"
            class="block mt-3"
          >
            <app-icon name="user-plus" size="sm"></app-icon>
            Dołącz ponownie
          </app-button>
        </div>
        }
        <!-- Participant options (hidden for withdrawn/rejected) -->
        @if (!isWithdrawnOrRejected()) {
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
            Opcje uczestnika
          </p>
          <div class="space-y-2">
            <!-- Event chat -->
            <div class="mb-3">
              <app-button
                appearance="outline"
                color="neutral"
                [fullWidth]="true"
                alignment="start"
                icon="message-circle"
                [iconBackground]="true"
                (clicked)="openChat.emit()"
              >
                <div class="text-left">
                  <p class="text-sm font-semibold text-neutral-900">Czat grupowy</p>
                  <p class="text-xs text-neutral-400">Porozmawiaj z uczestnikami wydarzenia</p>
                </div>
              </app-button>
            </div>

            <!-- Contact organizer -->
            <div class="mb-3">
              <app-button
                appearance="outline"
                color="neutral"
                [fullWidth]="true"
                alignment="start"
                icon="user"
                [iconBackground]="true"
                (clicked)="contactOrganizer.emit()"
              >
                <div class="text-left">
                  <p class="text-sm font-semibold text-neutral-900">
                    Czat prywatny z organizatorem
                  </p>
                  <p class="text-xs text-neutral-400">
                    Porozmawiaj z:
                    {{ _event?.organizer?.displayName || 'organizatorem wydarzenia' }}
                  </p>
                </div>
              </app-button>
            </div>

            <!-- Guest Management Section -->
            @if (!hasGuests()) {
            <!-- No guests yet - single full-width button -->
            <div class="mb-3">
              <app-button
                appearance="soft"
                color="success"
                [fullWidth]="true"
                alignment="start"
                icon="user-plus"
                [iconBackground]="true"
                (clicked)="addGuestRequested.emit()"
              >
                <div class="text-left">
                  <p class="text-sm font-semibold text-neutral-900">Dodaj osobę towarzyszącą</p>
                  <p class="text-xs text-neutral-400">Zgłoś do wydarzenia także swego znajomego</p>
                </div>
              </app-button>
            </div>
            } @else {
            <!-- Has guests - two buttons in one row -->
            <div class="flex gap-2">
              <div class="mb-3 flex justify-start">
                <app-button
                  appearance="outline"
                  color="neutral"
                  class="flex-[2]"
                  alignment="start"
                  icon="users"
                  [iconBackground]="true"
                  (clicked)="manageGuests.emit()"
                >
                  <div class="text-left">
                    <p class="text-sm font-semibold text-neutral-900">
                      Zarządzaj osobami towarzyszącymi
                    </p>
                    <p class="text-xs text-neutral-400">Przeglądaj i edytuj gości</p>
                  </div>
                </app-button>
              </div>
              <div class="mb-3 flex justify-start">
                <app-button
                  appearance="outline"
                  color="neutral"
                  class="flex-[1]"
                  alignment="start"
                  icon="user-plus"
                  [iconBackground]="true"
                  (clicked)="addGuestRequested.emit()"
                >
                  <div class="text-left">
                    <p class="text-sm font-semibold text-neutral-900">Dodaj kolejną</p>
                    <p class="text-xs text-neutral-400">Zaproś dodatkową osobę</p>
                  </div>
                </app-button>
              </div>
            </div>
            }

            <!-- Leave -->
            <div class="mb-3">
              <app-button
                appearance="soft"
                color="danger"
                [fullWidth]="true"
                alignment="start"
                icon="user-x"
                [iconBackground]="true"
                (clicked)="leaveRequested.emit()"
              >
                <div class="text-left">
                  <p class="text-sm font-semibold text-danger-400">Wypisz się z wydarzenia</p>
                  <p class="text-xs text-neutral-400">Stracisz swoje miejsce</p>
                </div>
              </app-button>
            </div>
          </div>
        </div>
        }
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
  readonly waitingReason = input<WaitingReason | null>(null);
  readonly participants = input<Participation[]>([]);

  readonly closed = output<void>();
  readonly openChat = output<void>();
  readonly payRequested = output<void>();
  readonly contactOrganizer = output<void>();
  readonly leaveRequested = output<void>();
  readonly rejoinRequested = output<void>();
  readonly addGuestRequested = output<void>();
  readonly manageGuests = output<void>();

  readonly isWithdrawnOrRejected = computed(() => {
    const s = this.participantStatus();
    return s === 'WITHDRAWN' || s === 'REJECTED';
  });

  readonly headerIcon = computed<IconName>(() => {
    const s = this.participantStatus();
    if (s === 'PENDING') return 'clock';
    if (s === 'APPROVED') return 'check';
    if (s === 'WITHDRAWN') return 'user-x';
    if (s === 'REJECTED') return 'x';
    return 'check-circle';
  });

  readonly headerIconColor = computed<SemanticColor>(() => {
    const s = this.participantStatus();
    if (s === 'PENDING') return 'warning';
    if (s === 'APPROVED') return 'info';
    if (s === 'WITHDRAWN') return 'neutral';
    if (s === 'REJECTED') return 'danger';
    return 'success';
  });

  readonly headerTitle = computed(() => {
    const status = this.participantStatus();
    if (status === 'PENDING') return 'Zgłoszenie wysłane!';
    if (status === 'APPROVED') return 'Zatwierdzone - potwierdź udział!';
    if (status === 'CONFIRMED') return 'Jesteś potwierdzonym uczestnikiem!';
    if (status === 'WITHDRAWN') return 'Wypisano z wydarzenia';
    if (status === 'REJECTED') return 'Zgłoszenie odrzucone';
    return 'Zgłoszenie wysłane!';
  });

  readonly headerDescription = computed(() => {
    const status = this.participantStatus();
    const options: ParticipationStatusOptions = {
      waitingReason: this.waitingReason(),
    };

    return getParticipationStatusDescription(status as ParticipationStatus | null, options);
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

  readonly canRejoin = computed(() => {
    const e = this.event();
    if (!e) return false;
    // Can rejoin if event hasn't started yet and is not cancelled
    const now = new Date();
    const startsAt = new Date(e.startsAt);
    return now < startsAt && e.status !== 'CANCELLED';
  });

  readonly hasGuests = computed(() => {
    const participants = this.participants();

    return participants.some((p) => p.isGuest && p.addedByUserId && p.wantsIn);
  });

  readonly guestCount = computed(() => {
    const participants = this.participants();

    return participants.filter((p) => p.isGuest && p.addedByUserId && p.wantsIn).length;
  });
}
