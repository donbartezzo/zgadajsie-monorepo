import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { EnrollmentGridItemComponent } from '../../../shared/enrollment/ui/enrollment-grid/enrollment-grid-item.component';
import { AuthService } from '../../../core/auth/auth.service';
import { BottomOverlaysService } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { Event as EventModel, WaitingReason, Participation } from '../../../shared/types';
import { isEventJoinable } from '../../../shared/utils';

@Component({
  selector: 'app-my-participation-details-overlay',
  imports: [BottomOverlayComponent, LinkListComponent, EnrollmentGridItemComponent],
  template: `
    <app-bottom-overlay [open]="open()" title="Twoje zapisy" (closed)="closed.emit()">
      @let _userParticipations = userParticipations();

      <div class="space-y-4 mx-auto">
        <!-- User participations listing -->
        @if (_userParticipations.length > 0) {
          <div class="flex flex-wrap gap-3 justify-center pb-3">
            @for (p of _userParticipations; track p.id) {
              <app-enrollment-grid-item
                [clickable]="true"
                [participant]="p"
                [showRole]="true"
                (clicked)="navigateToParticipants()"
              />
            }
          </div>
        }

        <div class="mx-auto max-w-lg mt-2 justify-center">
          <!-- Payment CTA (highlighted) -->
          <!-- @if (needsPayment()) {
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
          } -->

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
export class MyParticipationDetailsOverlayComponent {
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);
  private readonly overlays = inject(BottomOverlaysService);

  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly loading = input(false);
  readonly participantStatus = input<string | null>(null);
  readonly waitingReason = input<WaitingReason | null>(null);
  readonly participants = input<Participation[]>([]);

  readonly closed = output<void>();
  readonly payRequested = output<void>();
  readonly leaveRequested = output<void>();
  readonly rejoinRequested = output<void>();
  readonly addGuestRequested = output<void>();
  readonly manageGuests = output<void>();
  readonly participantClicked = output<Participation>();

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly userParticipations = computed<Participation[]>(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.participants().filter(
      (p) => (!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUser?.id === uid),
    );
  });

  readonly isWithdrawnOrRejected = computed(() => {
    const s = this.participantStatus();
    return s === 'WITHDRAWN' || s === 'REJECTED';
  });

  readonly needsPayment = computed(() => {
    const status = this.participantStatus();
    const cost = this.event()?.costPerPerson ?? 0;
    return status === 'APPROVED' && cost > 0;
  });

  readonly canRejoin = computed(() => {
    const e = this.event();
    if (!e) return false;
    return isEventJoinable(e.startsAt, e.status);
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

    const links: LinkListItem[] = [
      {
        label: 'Lista uczestników',
        description: 'Zobacz wszystkich uczestników wydarzenia',
        icon: 'users',
        value: 'participants-list',
        iconColor: 'info',
        iconBackground: true,
      },
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

    links.push({
      label: 'Dodaj kolejną osobę',
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

  navigateToParticipants(): void {
    const event = this.event();
    if (event) {
      this.navigation.navigateToEventParticipants(event.id, event.citySlug);
    }
  }

  handleParticipantOption(item: LinkListItem): void {
    const event = this.event();

    if (item.value === 'participants-list') {
      this.navigateToParticipants();
      return;
    }

    if (item.value === 'group-chat') {
      if (event) {
        this.overlays.close();
        this.navigation.navigateToEventChat(event.id, event.citySlug);
      }
      return;
    }

    if (item.value === 'organizer-chat') {
      if (event) {
        this.overlays.close();
        this.navigation.navigateToEventOrganizerChat(event.id, event.citySlug);
      }
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
