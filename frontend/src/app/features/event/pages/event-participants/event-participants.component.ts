import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { IconComponent } from '../../../../core/icons/icon.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventService } from '../../../../core/services/event.service';
import { Event as EventModel, Participation } from '../../../../shared/types';
import { getEnrollmentPhase } from '../../../../shared/utils/enrollment-phase.util';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';

const ACTIVE_STATUSES = ['APPROVED', 'CONFIRMED'];
const PENDING_STATUSES = ['PENDING'];
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-event-participants',
  imports: [UserAvatarComponent, IconComponent, LoadingSpinnerComponent, EventHeroSlotsComponent],
  templateUrl: './event-participants.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventParticipantsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);

  readonly event = signal<EventModel | null>(null);
  readonly participants = signal<Participation[]>([]);
  readonly loading = signal(true);

  readonly activeParticipants = computed(() =>
    this.participants().filter((p) => ACTIVE_STATUSES.includes(p.status)),
  );

  readonly pendingParticipants = computed(() =>
    this.participants().filter((p) => PENDING_STATUSES.includes(p.status)),
  );

  readonly withdrawnParticipants = computed(() =>
    this.participants().filter((p) => WITHDRAWN_STATUSES.includes(p.status)),
  );

  readonly subtitle = computed(() => {
    if (this.isPreEnrollment()) return 'Pre-zapisy';
    const count = this.activeParticipants().length;
    return `${count} ${count === 1 ? 'uczestnik' : 'uczestników'}`;
  });

  readonly isPreEnrollment = computed(() => {
    const e = this.event();
    if (!e) return false;
    const phase = getEnrollmentPhase(e.startsAt, e.lotteryExecutedAt, e.status);
    return phase === 'PRE_ENROLLMENT';
  });

  readonly totalPendingCount = computed(() => this.participants().length);

  private get eventId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => this.event.set(e),
    });
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (p) => {
        this.participants.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
