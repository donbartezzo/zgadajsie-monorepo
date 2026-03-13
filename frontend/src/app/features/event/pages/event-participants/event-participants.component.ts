import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';

const ACTIVE_STATUSES = ['APPLIED', 'ACCEPTED', 'PARTICIPANT', 'PENDING_PAYMENT'];
const PENDING_STATUSES = ['RESERVE'];
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED', 'BANNED'];

@Component({
  selector: 'app-event-participants',
  imports: [UserAvatarComponent, IconComponent, LoadingSpinnerComponent, LayoutSlotDirective],
  templateUrl: './event-participants.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventParticipantsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly layoutConfig = inject(LayoutConfigService);

  constructor() {
    this.layoutConfig.titleText.set('Uczestnicy');
    effect(() => {
      const filename = this.event()?.coverImage?.filename;
      if (filename) {
        this.layoutConfig.coverImageUrl.set(coverImageUrl(filename));
      }
    });
  }

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
    const count = this.activeParticipants().length;
    return `${count} ${count === 1 ? 'uczestnik' : 'uczestników'}`;
  });

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
