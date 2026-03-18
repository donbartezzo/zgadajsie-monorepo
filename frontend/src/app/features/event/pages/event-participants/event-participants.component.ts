import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import {
  ParticipantSlotsGridComponent,
  ParticipantItem,
} from '../../../../shared/ui/participant-slots-grid/participant-slots-grid.component';
import { ParticipantDetailOverlayComponent } from '../../../../shared/ui/participant-detail-overlay/participant-detail-overlay.component';
import {
  EventNotificationBarsComponent,
  NotificationBarConfig,
} from '../../ui/event-notification-bars/event-notification-bars.component';
import { EventAreaService } from '../../services/event-area.service';

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
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  private readonly eventArea = inject(EventAreaService);

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

  // ── Local state ──
  readonly selectedParticipant = signal<ParticipantItem | null>(null);
  readonly detailOverlayOpen = signal(false);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  // Notification bars config - delegates to EventAreaService
  readonly notificationBars = computed<NotificationBarConfig[]>(() => {
    const bars: NotificationBarConfig[] = [];
    const status = this.participantStatus();
    if (!status) return bars;

    const config = this.eventArea.getParticipantBarConfig(status);
    bars.push(config);

    return bars;
  });

  ngAfterViewInit(): void {
    // Scroll to current user after view init
    setTimeout(() => this.scrollToCurrentUser(), 100);
  }

  private scrollToCurrentUser(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const el = document.querySelector(`[data-user-id="${userId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  onBarAction(barId: string): void {
    if (barId === 'participant') {
      this.eventArea.openJoinConfirmOverlay();
    }
  }
}
