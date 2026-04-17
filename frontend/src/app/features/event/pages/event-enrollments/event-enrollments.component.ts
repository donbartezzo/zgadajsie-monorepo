import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import { EnrollmentGridComponent } from '../../../../shared/enrollment/ui/enrollment-grid/enrollment-grid.component';
import { EventStickyNotificationBarComponent } from '../../ui/event-sticky-notification-bar/event-sticky-notification-bar.component';
import { EventService } from '../../../../core/services/event.service';
import { EventAreaService } from '../../services/event-area.service';
import { EventSlotInfo } from '../../../../shared/types';

@Component({
  selector: 'app-event-enrollments',
  imports: [
    LoadingSpinnerComponent,
    EventHeroSlotsComponent,
    EnrollmentGridComponent,
    EventStickyNotificationBarComponent,
  ],
  templateUrl: './event-enrollments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEnrollmentsComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  public readonly auth = inject(AuthService);
  protected readonly eventArea = inject(EventAreaService);
  private readonly eventService = inject(EventService);

  readonly event = this.eventArea.event;
  readonly participants = this.eventArea.participants;
  readonly loading = this.eventArea.loading;
  readonly notificationBars = this.eventArea.notificationBars;

  readonly slots = signal<EventSlotInfo[]>([]);
  private slotsSubscription: Subscription | null = null;

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToCurrentUser(), 100);

    this.eventArea.refreshCompleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSlots());

    this.loadSlots();
  }

  private loadSlots(): void {
    const eventId = this.eventArea.eventId;
    if (!eventId) return;

    if (this.slotsSubscription) {
      this.slotsSubscription.unsubscribe();
      this.slotsSubscription = null;
    }

    this.slotsSubscription = this.eventService
      .getSlots(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (slots) => this.slots.set(slots),
      });
  }

  onRefreshNeeded(): void {
    this.eventArea.refreshParticipants();
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
}
