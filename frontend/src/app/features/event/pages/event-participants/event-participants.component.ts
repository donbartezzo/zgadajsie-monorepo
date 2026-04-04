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
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import { ParticipantSlotsGridComponent } from '../../../../shared/participant/ui/participant-slots-grid/participant-slots-grid.component';
import { EventStickyNotificationBarComponent } from '../../ui/event-sticky-notification-bar/event-sticky-notification-bar.component';
import { EventService } from '../../../../core/services/event.service';
import { EventAreaService } from '../../services/event-area.service';
import { EventSlotInfo } from '../../../../shared/types';

@Component({
  selector: 'app-event-participants',
  imports: [
    LoadingSpinnerComponent,
    EventHeroSlotsComponent,
    ParticipantSlotsGridComponent,
    EventStickyNotificationBarComponent,
  ],
  templateUrl: './event-participants.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventParticipantsComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  public readonly auth = inject(AuthService);
  protected readonly eventArea = inject(EventAreaService);
  private readonly eventService = inject(EventService);

  // ── Delegated from EventAreaService ──
  readonly event = this.eventArea.event;
  readonly participants = this.eventArea.participants;
  readonly loading = this.eventArea.loading;
  readonly notificationBars = this.eventArea.notificationBars;

  // ── Local state ──
  readonly slots = signal<EventSlotInfo[]>([]);
  readonly showOnlyMyParticipations = signal(false);

  readonly filteredParticipants = computed(() => {
    const all = this.participants();
    if (!this.showOnlyMyParticipations()) return all;
    const userId = this.auth.currentUser()?.id;
    if (!userId) return all;
    return all.filter((p) => p.userId === userId || p.addedByUserId === userId);
  });

  // When filtering, pass only slots of the filtered participants so empty slots are hidden
  readonly filteredSlots = computed(() => {
    if (!this.showOnlyMyParticipations()) return this.slots();
    const ids = new Set(this.filteredParticipants().map((p) => p.id));
    return this.slots().filter((s) => s.participationId != null && ids.has(s.participationId!));
  });

  ngAfterViewInit(): void {
    const showOnlyMine = this.route.snapshot.data['showOnlyMine'] as boolean;
    if (showOnlyMine) {
      this.showOnlyMyParticipations.set(true);
    }
    setTimeout(() => this.scrollToCurrentUser(), 100);
    this.loadSlots();
  }

  private loadSlots(): void {
    const eventId = this.eventArea.eventId;
    if (!eventId) return;
    this.eventService.getSlots(eventId).subscribe({
      next: (slots) => this.slots.set(slots),
    });
  }

  onRefreshNeeded(): void {
    this.eventArea.refreshParticipants();
    this.loadSlots();
  }

  private scrollToCurrentUser(): void {
    const newUserId = this.route.snapshot.queryParamMap.get('newUserId');
    const userId = newUserId || this.auth.currentUser()?.id;
    if (!userId) return;
    const slotEl = document.querySelector(`[data-user-id="${userId}"]`);
    if (slotEl) {
      slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  onToggleFilterMine(checked: boolean): void {
    this.showOnlyMyParticipations.set(checked);
    const citySlug = this.route.snapshot.paramMap.get('citySlug');
    const eventId = this.route.snapshot.paramMap.get('id');
    if (checked) {
      this.router.navigate(['/w', citySlug, eventId, 'participants', 'my']);
    } else {
      this.router.navigate(['/w', citySlug, eventId, 'participants']);
    }
  }
}
