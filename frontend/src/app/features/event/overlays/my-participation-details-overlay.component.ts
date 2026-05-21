import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { EnrollmentGridItemComponent } from '../../../shared/enrollment/ui/enrollment-grid/enrollment-grid-item/enrollment-grid-item.component';
import { EnrollmentParticipantActionsComponent } from '../../../shared/enrollment/ui/enrollment-participant-actions/enrollment-participant-actions.component';
import { AuthService } from '../../../core/auth/auth.service';
import { BottomOverlaysService } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { Event as EventModel, Participation } from '../../../shared/types';
import { SectionSeparatorComponent } from '../../../shared/ui/section-separator/section-separator.component';

@Component({
  selector: 'app-my-participation-details-overlay',
  imports: [
    BottomOverlayComponent,
    LinkListComponent,
    EnrollmentGridItemComponent,
    EnrollmentParticipantActionsComponent,
    SectionSeparatorComponent,
  ],
  template: `
    <app-bottom-overlay [open]="open()" title="Twoje zapisy" (closed)="closed.emit()">
      @let _userParticipations = userParticipations();
      @let _activeParticipation = activeParticipation();
      @let _event = event();

      <div>
        <div class="mx-auto p-1 rounded-xl border-2 border-neutral-300">
          <!-- Tab bar for user participations -->
          @if (_userParticipations.length > 0) {
            <div class="flex flex-wrap gap-3 justify-center py-1">
              @for (p of _userParticipations; track p.id) {
                <app-enrollment-grid-item
                  [participant]="p"
                  [showRole]="true"
                  [active]="p.id === _activeParticipation?.id"
                  (clicked)="activeParticipationId.set(p.id)"
                />
              }
            </div>
          }

          <!-- Active participation content -->
          @if (_activeParticipation) {
            <div class="mx-auto max-w-lg">
              <!-- Participant actions -->
              <div>
                <app-enrollment-participant-actions
                  [participant]="_activeParticipation"
                  [event]="_event!"
                  (actionCompleted)="handleActionCompleted()"
                  (closeRequested)="closed.emit()"
                />
              </div>
            </div>
          }
        </div>

        <!-- General event options -->
        <div class="mx-auto max-w-lg border-2 border-transparent">
          <app-section-separator label="Opcje wydarzenia" />

          <app-link-list
            [items]="participantLinks()"
            (itemClicked)="handleParticipantOption($event)"
          />
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
  readonly participants = input<Participation[]>([]);

  readonly closed = output<void>();
  readonly payRequested = output<void>();
  readonly addGuestRequested = output<void>();

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly userParticipations = computed<Participation[]>(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.participants().filter(
      (p) => (!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUser?.id === uid),
    );
  });

  readonly activeParticipationId = signal<string | null>(null);

  readonly activeParticipation = computed(() => {
    const id = this.activeParticipationId();
    const participations = this.userParticipations();
    if (!id) {
      // Prefer host (isGuest = false), fallback to first
      const host = participations.find((p) => !p.isGuest);
      return host ?? participations[0] ?? null;
    }
    return participations.find((p) => p.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      const participations = this.userParticipations();
      const currentId = this.activeParticipationId();

      // Set default to host when participations change and no ID is set
      if (participations.length > 0 && !currentId) {
        const host = participations.find((p) => !p.isGuest);
        this.activeParticipationId.set((host ?? participations[0]).id);
      }

      // Reset to host if current ID is no longer valid
      if (currentId && !participations.find((p) => p.id === currentId)) {
        const host = participations.find((p) => !p.isGuest);
        this.activeParticipationId.set((host ?? participations[0])?.id ?? null);
      }
    });
  }

  readonly participantLinks = computed<LinkListItem[]>(() => {
    const organizerName = this.event()?.organizer?.displayName || 'organizatorem wydarzenia';

    const links: LinkListItem[] = [
      {
        label: 'Dodaj kolejną osobę',
        description: 'Zgłoś do wydarzenia także swego znajomego',
        icon: 'user-plus',
        value: 'add-guest',
        appearance: 'soft',
        color: 'success',
      },
      {
        label: 'Lista uczestników',
        description: 'Zobacz wszystkich uczestników wydarzenia',
        icon: 'users',
        value: 'participants-list',
        iconColor: 'info',
      },
      {
        label: 'Czat grupowy',
        description: 'Porozmawiaj z uczestnikami wydarzenia',
        icon: 'message-circle',
        value: 'group-chat',
        iconColor: 'info',
      },
      {
        label: 'Czat prywatny z organizatorem',
        description: `Porozmawiaj z: ${organizerName}`,
        icon: 'user',
        value: 'organizer-chat',
        iconColor: 'neutral',
      },
    ];

    return links;
  });

  navigateToParticipants(): void {
    const event = this.event();
    if (event) {
      this.navigation.navigateToEventParticipants(event.id, event.citySlug);
    }
  }

  handleActionCompleted(): void {
    this.closed.emit();
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

    if (item.value === 'add-guest') {
      this.addGuestRequested.emit();
      return;
    }
  }
}
