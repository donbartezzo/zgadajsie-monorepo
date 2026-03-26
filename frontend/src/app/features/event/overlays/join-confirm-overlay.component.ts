import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/ui/icon/icon.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
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
import { formatTime, formatDateFull } from '@zgadajsie/shared';

@Component({
  selector: 'app-join-confirm-overlay',
  imports: [IconComponent, BottomOverlayComponent, LinkListComponent],
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
            <div class="mt-3">
              <app-link-list [items]="paymentLinks()" (itemClicked)="payRequested.emit()" />
            </div>
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
            <div class="mt-3">
              <app-link-list [items]="rejoinLinks()" (itemClicked)="rejoinRequested.emit()" />
            </div>
          </div>
        }
        <!-- Participant options (hidden for withdrawn/rejected) -->
        @if (!isWithdrawnOrRejected()) {
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
              Opcje uczestnika
            </p>
            <app-link-list
              [items]="participantLinks()"
              (itemClicked)="handleParticipantOption($event)"
            />
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
    return formatDateFull(e.startsAt);
  });

  readonly startTimeFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return formatTime(e.startsAt);
  });

  readonly endTimeFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return formatTime(e.endsAt);
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

  readonly paymentLinks = computed<LinkListItem[]>(() => [
    {
      label: 'Opłać udział',
      icon: 'dollar-sign',
      value: 'pay',
      color: 'primary',
      iconColor: 'primary',
      iconBackground: true,
      loading: this.loading(),
    },
  ]);

  readonly rejoinLinks = computed<LinkListItem[]>(() => [
    {
      label: 'Dołącz ponownie',
      icon: 'user-plus',
      value: 'rejoin',
      color: 'primary',
      iconColor: 'primary',
      iconBackground: true,
      loading: this.loading(),
    },
  ]);

  readonly participantLinks = computed<LinkListItem[]>(() => {
    const organizerName = this.event()?.organizer?.displayName || 'organizatorem wydarzenia';
    const guestCount = this.guestCount();

    const links: LinkListItem[] = [
      {
        label: 'Czat grupowy',
        description: 'Porozmawiaj z uczestnikami wydarzenia',
        icon: 'message-circle',
        value: 'group-chat',
        iconColor: 'info',
        iconBackground: true,
      },
      {
        label: 'Czat prywatny z organizatorem',
        description: `Porozmawiaj z: ${organizerName}`,
        icon: 'user',
        value: 'organizer-chat',
        iconColor: 'neutral',
        iconBackground: true,
      },
    ];

    if (this.hasGuests()) {
      links.push({
        label: `Osoby towarzyszące (${guestCount})`,
        description: 'Przeglądaj i zarządzaj dodanymi gośćmi',
        icon: 'users',
        value: 'manage-guests',
        iconColor: 'neutral',
        iconBackground: true,
      });
    }

    links.push({
      label: this.hasGuests() ? 'Dodaj kolejną osobę towarzyszącą' : 'Dodaj osobę towarzyszącą',
      description: 'Zgłoś do wydarzenia także swego znajomego',
      icon: 'user-plus',
      value: 'add-guest',
      color: 'success',
      iconColor: 'success',
      iconBackground: true,
    });

    links.push({
      label: 'Wypisz się z wydarzenia',
      description: 'Stracisz swoje miejsce',
      icon: 'user-x',
      value: 'leave',
      color: 'danger',
      iconColor: 'danger',
      iconBackground: true,
    });

    return links;
  });

  handleParticipantOption(item: LinkListItem): void {
    if (item.value === 'group-chat') {
      this.openChat.emit();
      return;
    }

    if (item.value === 'organizer-chat') {
      this.contactOrganizer.emit();
      return;
    }

    if (item.value === 'manage-guests') {
      this.manageGuests.emit();
      return;
    }

    if (item.value === 'add-guest') {
      this.addGuestRequested.emit();
      return;
    }

    if (item.value === 'leave') {
      this.leaveRequested.emit();
    }
  }
}
