import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/ui/icon/icon.component';
import { EventInfoGridComponent } from '../../../shared/ui/event-info-grid/event-info-grid.component';
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
  isEventJoinable,
} from '../../../shared/utils';

@Component({
  selector: 'app-join-confirm-overlay',
  imports: [IconComponent, BottomOverlayComponent, LinkListComponent, EventInfoGridComponent],
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
      <div class="space-y-4 mx-auto">
        <!-- Event info grid (compact selection via show config) -->
        @if (_event) {
          <app-event-info-grid
            [event]="_event"
            [show]="{
              cost: false,
              maxParticipants: false,
              gender: false,
              age: false,
              enrollment: false,
              city: false,
              roles: false,
              duration: false,
            }"
            [showHeader]="false"
          />
        }

        <div class="mx-auto max-w-lg mt-2 justify-center">
          <!-- Payment CTA (highlighted) -->
          @if (needsPayment()) {
            <div class="rounded-xl border-2 border-danger-200">
              <div class="p-2">
                <p class="text-sm font-bold text-danger-400 text-center">Wymagana płatność</p>
                <p class="text-xs text-danger-400 mt-0.5 text-center">
                  Opłać {{ _event?.costPerPerson }} zł, aby potwierdzić swój udział.
                </p>
              </div>
              <div>
                <app-link-list [items]="paymentLinks()" (itemClicked)="payRequested.emit()" />
              </div>
            </div>
          }

          <!-- Rejoin CTA for withdrawn users -->
          @if (isWithdrawnOrRejected() && canRejoin()) {
            <div class="rounded-xl border-2 border-primary-200 mt-2">
              <div class="p-2">
                <p class="text-sm font-bold text-primary-600 text-center">Chcesz wrócić?</p>
                <p class="text-xs text-primary-500 mt-0.5 text-center">
                  Możesz ponownie dołączyć do tego wydarzenia.
                </p>
              </div>
              <div>
                <app-link-list [items]="rejoinLinks()" (itemClicked)="rejoinRequested.emit()" />
              </div>
            </div>
          }

          <!-- Participant options (hidden for withdrawn/rejected) -->
          @if (!isWithdrawnOrRejected()) {
            <div class="mt-2">
              <app-link-list
                [items]="participantLinks()"
                (itemClicked)="handleParticipantOption($event)"
              />
            </div>
          }
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
    if (status === 'CONFIRMED') return 'Jesteś już potwierdzonym uczestnikiem!';
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

  readonly needsPayment = computed(() => {
    const status = this.participantStatus();
    const cost = this.event()?.costPerPerson ?? 0;
    return status === 'APPROVED' && cost > 0;
  });

  readonly canRejoin = computed(() => {
    const e = this.event();
    if (!e) return false;
    // Can rejoin if event hasn't started yet and is not cancelled
    return isEventJoinable(e.startsAt, e.status);
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
      color: 'success',
      iconColor: 'success',
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
