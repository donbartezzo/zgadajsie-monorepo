import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  NgZone,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../../ui/icon/icon.component';
import { DateBadgeComponent } from '../date-badge/date-badge.component';
import { EventStatusBadgeComponent } from '../event-status-badge/event-status-badge.component';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import { EventBase } from '../../../types';
import { getEventCoverUrl } from '../../../types/cover-image.interface';
import {
  getEventCountdown,
  formatMonthShort,
  getDayOfMonth,
  formatTime,
  MILLISECONDS_PER_HOUR,
  nowInZone,
  isSameDay,
  EventStatus,
} from '@zgadajsie/shared';
import { TranslocoPipe } from '@jsverse/transloco';
import { EventDurationPipe } from '../../../pipes/event-duration.pipe';
import { DateLabelsService } from '../../../services/date-labels.service';

@Component({
  selector: 'app-event-card',
  imports: [
    DecimalPipe,
    IconComponent,
    DateBadgeComponent,
    EventStatusBadgeComponent,
    CapacityProgressComponent,
    TranslocoPipe,
    EventDurationPipe,
  ],
  template: `
    @let _event = event();
    @let _countdown = countdown();
    @let _coverUrl = coverUrl();

    <button
      type="button"
      [class]="
        'rounded-2xl shadow-xs overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white border-2 text-left w-full ' +
        borderClass()
      "
      (click)="selected.emit(_event)"
    >
      <div class="relative">
        <div [class]="isDimmed() ? 'opacity-85 grayscale' : ''">
          <div class="relative h-44 overflow-hidden">
            @if (_coverUrl) {
              <img
                [src]="_coverUrl"
                [alt]="_event.title"
                class="absolute inset-0 h-full w-full object-cover"
              />
            } @else {
              <div class="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-500"></div>
            }

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            ></div>

            <div class="absolute inset-x-0 bottom-0 p-3">
              <h3 class="text-sm font-bold text-white line-clamp-2 drop-shadow-xs">
                {{ _event.title }}
              </h3>
              <div class="mt-1 flex flex-wrap gap-1">
                @if (_event.discipline) {
                  <span
                    class="rounded-xs bg-primary-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
                    >{{ 'dict.discipline.' + _event.discipline!.slug | transloco }}</span
                  >
                }
                @if (_event.level) {
                  <span
                    class="rounded-xs bg-warning-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
                    >{{ 'dict.level.' + _event.level!.slug | transloco }}</span
                  >
                }
                @if (_event.facility) {
                  <span
                    class="rounded-xs bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white backdrop-blur-xs"
                    >{{ 'dict.facility.' + _event.facility!.slug | transloco }}</span
                  >
                }
              </div>
            </div>
          </div>

          <div class="p-3 space-y-2">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span class="flex items-center gap-1">
                <app-icon name="map-pin" size="xs" color="neutral" muted="light" />
                {{ _event.address }}
              </span>
              <span class="flex items-center gap-1">
                <app-icon name="clock" size="xs" color="neutral" muted="light" />
                {{ eventStartTime() }}-{{ eventEndTime() }} ({{
                  event().startsAt | eventDuration: event().endsAt
                }})
              </span>
            </div>

            <div class="flex items-center justify-between">
              <app-capacity-progress
                class="flex-1 max-w-[250px]"
                [current]="_event._count?.enrollments ?? 0"
                [max]="_event.maxParticipants"
              />

              <span
                class="flex items-center gap-1 text-sm font-semibold text-success-400 w-24 justify-end"
              >
                @if (_event.costPerPerson > 0) {
                  <app-icon name="credit-card" size="xs" color="success" />
                  {{ _event.costPerPerson | number: '1.0-2' }} zł
                } @else {
                  <app-icon name="check-circle" size="xs" color="success" />
                  Bezpłatne
                }
              </span>
            </div>
          </div>
        </div>

        <div class="absolute right-2 top-2 z-10">
          <app-date-badge
            [month]="eventMonth()"
            [day]="eventDay()"
            [time]="eventStartTime()"
            size="sm"
          />
        </div>

        <div class="absolute left-2 top-2 z-10">
          @if (isCancelled()) {
            <app-event-status-badge variant="cancelled" label="ODWOŁANE" />
          } @else if (isOngoing()) {
            <app-event-status-badge variant="ongoing" label="TRWA" />
          } @else if (_countdown) {
            <app-event-status-badge
              [variant]="_countdown.isUrgent ? 'countdown-urgent' : 'countdown-soon'"
              [label]="countdownLabel()"
            />
          } @else {
            <app-event-status-badge variant="date" [label]="badgeLabel()" />
          }
        </div>
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly dateLabels = inject(DateLabelsService);

  readonly event = input.required<EventBase>();
  readonly isDimmed = input(false);
  readonly dateLabel = input<string | null>(null);
  readonly selected = output<EventBase>();

  readonly isCancelled = computed(() => this.event().status === EventStatus.CANCELLED);

  private readonly now = signal(nowInZone().toJSDate());

  readonly isOngoing = computed(() => {
    if (this.isCancelled()) return false;
    const start = new Date(this.event().startsAt).getTime();
    const end = new Date(this.event().endsAt).getTime();
    const nowMs = this.now().getTime();
    return nowMs >= start && nowMs < end;
  });
  private intervalId?: number;

  readonly coverUrl = computed(() => getEventCoverUrl(this.event()));

  readonly isToday = computed(() => {
    const eventDate = this.event().startsAt;
    const now = this.now();
    return isSameDay(eventDate, now);
  });

  readonly countdown = computed(() =>
    getEventCountdown(this.event().startsAt, this.event().endsAt),
  );

  readonly borderClass = computed(() => {
    if (this.isOngoing()) return 'border-success-400';
    const cd = this.countdown();
    if (cd?.isUrgent) return 'border-warning-400';
    if (cd) return 'border-info-400';
    if (this.isToday()) return 'border-primary-400';
    return 'border-neutral-200';
  });

  readonly eventMonth = computed(() => formatMonthShort(this.event().startsAt));

  readonly eventDay = computed(() => getDayOfMonth(this.event().startsAt).toString());

  readonly eventStartTime = computed(() => formatTime(this.event().startsAt));

  readonly eventEndTime = computed(() => formatTime(this.event().endsAt));

  readonly countdownLabel = computed(() => {
    const cd = this.countdown();
    if (!cd) return '';
    return this.dateLabels.formatCountdownLabel(cd);
  });

  readonly badgeLabel = computed(() => {
    const label = this.dateLabel();
    if (label) return label;
    return this.dateLabels.getRelativeDateLabel(new Date(this.event().startsAt));
  });

  constructor() {
    effect(() => {
      const evt = this.event();
      const start = new Date(evt.startsAt).getTime();
      const end = new Date(evt.endsAt).getTime();
      const nowMs = this.now().getTime();
      const hoursUntil = (start - nowMs) / MILLISECONDS_PER_HOUR;
      const isCurrentlyOngoing = nowMs >= start && nowMs < end;

      if ((hoursUntil > 0 && hoursUntil <= 24) || isCurrentlyOngoing) {
        this.startCountdown();
      } else {
        this.stopCountdown();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    if (this.intervalId) return;

    // Run outside Angular zone to avoid triggering change detection every minute.
    // Only re-enter the zone when updating the signal, which is the actual state change.
    this.ngZone.runOutsideAngular(() => {
      this.intervalId = window.setInterval(() => {
        this.ngZone.run(() => {
          this.now.set(nowInZone().toJSDate());
        });
      }, 60000);
    });
  }

  private stopCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
