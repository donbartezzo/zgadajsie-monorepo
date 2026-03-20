import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import {
  ParticipantSlotsGridComponent,
  ParticipantItem,
} from '../../../../shared/participant/ui/participant-slots-grid/participant-slots-grid.component';
import { ParticipantDetailOverlayComponent } from '../../../../shared/participant/ui/participant-detail-overlay/participant-detail-overlay.component';
import {
  EventNotificationBarsComponent,
  NotificationBarConfig,
} from '../../ui/event-notification-bars/event-notification-bars.component';
import { EventService } from '../../../../core/services/event.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { EventAreaService } from '../../services/event-area.service';
import {
  applyProfileChange,
  ProfileBroadcastService,
} from '../../../../core/services/profile-broadcast.service';

@Component({
  selector: 'app-event-participants',
  imports: [
    LoadingSpinnerComponent,
    EventHeroSlotsComponent,
    ParticipantSlotsGridComponent,
    ParticipantDetailOverlayComponent,
    EventNotificationBarsComponent,
  ],
  templateUrl: './event-participants.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventParticipantsComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);
  public readonly auth = inject(AuthService); // Changed from private to public for template access
  private readonly eventArea = inject(EventAreaService);
  private readonly eventService = inject(EventService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

  // ── Delegated from EventAreaService ──
  readonly event = this.eventArea.event;
  readonly participants = this.eventArea.participants;
  readonly loading = this.eventArea.loading;
  readonly enrollmentPhase = this.eventArea.enrollmentPhase;
  readonly maxSlots = this.eventArea.maxSlots;
  readonly isPaidEvent = this.eventArea.isPaidEvent;
  readonly canJoin = this.eventArea.canJoin;
  readonly isParticipant = this.eventArea.isParticipant;
  readonly participantStatus = this.eventArea.participantStatus;
  readonly waitingReason = this.eventArea.waitingReason;

  readonly isOrganizer = this.eventArea.isOrganizer;

  // ── Local state ──
  readonly selectedParticipant = signal<ParticipantItem | null>(null);
  readonly detailOverlayOpen = signal(false);
  readonly showOnlyMyParticipations = signal(false);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  // Filtered participants based on "only my participations" toggle
  readonly filteredParticipants = computed(() => {
    const all = this.participants();
    if (!this.showOnlyMyParticipations()) return all;

    const userId = this.currentUserId();
    if (!userId) return all;

    // Filter to only participations where user is the participant OR added the guest
    return all.filter((p) => p.userId === userId || p.addedByUserId === userId);
  });

  // Hide empty slots when filtering to "only mine"
  readonly effectiveMaxSlots = computed(() => {
    if (this.showOnlyMyParticipations()) {
      return this.filteredParticipants().filter(
        (p) => p.status === 'APPROVED' || p.status === 'CONFIRMED',
      ).length;
    }
    return this.maxSlots();
  });

  readonly detailMode = computed(() => {
    if (this.isOrganizer()) return 'organizer';

    const p = this.selectedParticipant();
    const currentUserId = this.currentUserId();

    // Check if the selected participant is a guest added by the current user
    if (p && p.isGuest && p.addedByUserId === currentUserId) {
      return 'guest-manager';
    }

    return 'public';
  });

  // Notification bars config - delegates to EventAreaService
  readonly notificationBars = computed<NotificationBarConfig[]>(() => {
    const bars: NotificationBarConfig[] = [];
    const status = this.participantStatus();

    if (status) {
      const config = this.eventArea.getParticipantBarConfig(status);
      bars.push(config);
    }

    return bars;
  });

  ngAfterViewInit(): void {
    // Subscribe to profile changes broadcast
    this.profileBroadcast.changes$.subscribe((change) => {
      const selected = this.selectedParticipant();
      if (selected) {
        const next = applyProfileChange(selected, change);
        if (next !== selected) {
          this.selectedParticipant.set(next as ParticipantItem);
        }
      }
    });

    // Check for showOnlyMine route data
    const showOnlyMine = this.route.snapshot.data['showOnlyMine'] as boolean;
    if (showOnlyMine) {
      this.showOnlyMyParticipations.set(true);
    }

    // Scroll to current user after view init
    setTimeout(() => this.scrollToCurrentUser(), 100);
  }

  private scrollToCurrentUser(): void {
    const newUserId = this.route.snapshot.queryParamMap.get('newUserId');
    const userId = newUserId || this.auth.currentUser()?.id;
    if (!userId) return;

    // First try finding user's specific slot (data-user-id on slot element)
    const slotEl = document.querySelector(`[data-user-id="${userId}"]`);
    if (slotEl) {
      slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  onParticipantClick(participant: ParticipantItem): void {
    this.selectedParticipant.set(participant);
    this.detailOverlayOpen.set(true);
  }

  onEmptySlotClick(): void {
    // Always handle click - redirect to login if not logged in
    if (!this.auth.isLoggedIn()) {
      const returnUrl = `/w/${this.eventArea.citySlug}/${this.eventArea.eventId}?openJoin=true`;
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl },
      });
      return;
    }

    // Check if user can join
    if (!this.canJoin()) {
      const phase = this.enrollmentPhase();
      if (phase === 'LOTTERY_PENDING') {
        this.snackbar.info('Trwa losowanie miejsc. Poczekaj na wyniki.');
      } else {
        this.snackbar.info('Zapisy na to wydarzenie są zamknięte.');
      }
      return;
    }

    // Navigate to event page with openJoin param to trigger join overlay
    this.router.navigate(['/w', this.eventArea.citySlug, this.eventArea.eventId], {
      queryParams: { openJoin: true },
    });
  }

  closeDetailOverlay(): void {
    this.detailOverlayOpen.set(false);
    this.selectedParticipant.set(null);
  }

  async onRemoveGuestRequested(participationId: string): Promise<void> {
    const participant = this.selectedParticipant();
    if (!participant) return;

    this.confirmModal
      .confirm({
        title: 'Wypisz gościa?',
        message: `Czy na pewno chcesz wypisać tego gościa z wydarzenia?\n\nGość: ${participant.user?.displayName}`,
        confirmLabel: 'Wypisz',
        cancelLabel: 'Anuluj',
        color: 'danger',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.eventService.leaveParticipation(participationId).subscribe({
            next: () => {
              this.snackbar.success('Gość został wypisany z wydarzenia');
              this.closeDetailOverlay();
              this.eventArea.refreshParticipants();
            },
            error: (err) => {
              this.snackbar.error(err.error?.message || 'Nie udało się wypisać gościa');
            },
          });
        }
      });
  }

  onToggleFilterMine(checked: boolean): void {
    this.showOnlyMyParticipations.set(checked);

    // Get citySlug and eventId from activated route params
    const citySlug = this.route.snapshot.paramMap.get('citySlug');
    const eventId = this.route.snapshot.paramMap.get('id');

    if (checked) {
      this.router.navigate(['/w', citySlug, eventId, 'participants', 'my']);
    } else {
      this.router.navigate(['/w', citySlug, eventId, 'participants']);
    }
  }

  onBarAction(barId: string): void {
    if (barId === 'participant') {
      this.eventArea.openJoinConfirmOverlay();
    }
  }
}
