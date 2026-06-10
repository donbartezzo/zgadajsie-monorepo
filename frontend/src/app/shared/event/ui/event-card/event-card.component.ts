import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  NgZone,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventInfoItemComponent } from '../../../ui/event-info-item/event-info-item.component';
import { DateBadgeComponent } from '../date-badge/date-badge.component';
import { EventStatusBadgeComponent } from '../event-status-badge/event-status-badge.component';
import { EventBadgesComponent } from '../event-badges/event-badges.component';
import { EventCapacityProgressComponent } from '../event-capacity-progress/event-capacity-progress.component';
import { EventBase } from '../../../types';
import { buildCoverImageUrl, DEFAULT_COVER_IMAGE_URL } from '../../../utils/cover-image.utils';
import {
  getEventCountdown,
  formatMonthShort,
  getDayOfMonth,
  formatTime,
  formatDateRangeLabel,
  MILLISECONDS_PER_HOUR,
  nowInZone,
  EventStatus,
} from '@zgadajsie/shared';
import { isPreEnrollment, isEventJoinable } from '../../../utils/event-time-status.util';
import { DateLabelsService } from '../../../services/date-labels.service';
import { EventDurationPipe } from '../../../pipes/event-duration.pipe';
import { IconComponent } from '../../../ui/icon/icon.component';

@Component({
  selector: 'app-event-card',
  imports: [
    CommonModule,
    EventInfoItemComponent,
    DateBadgeComponent,
    EventStatusBadgeComponent,
    EventBadgesComponent,
    EventCapacityProgressComponent,
    EventDurationPipe,
    IconComponent,
  ],
  template: `
    @let _event = event();
    @let _coverSrc = coverSrc();

    <button
      type="button"
      class="rounded-2xl shadow-xs overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white border-2 border-neutral-400 text-left w-full"
      (click)="selected.emit(_event)"
    >
      <div class="relative">
        <div [class]="isDimmed() ? 'opacity-85 grayscale' : ''">
          <div class="relative h-44 overflow-hidden">
            @if (_coverSrc) {
              <img
                [src]="_coverSrc"
                [alt]="_event.title"
                class="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                width="700"
                height="250"
                (error)="onCoverImageError()"
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
              <div class="mt-1">
                <app-event-badges [event]="_event" size="card" />
              </div>
            </div>
          </div>

          <div class="p-3 space-y-2">
            <div class="flex items-center justify-between gap-x-2 gap-y-1">
              <div class="min-w-0 overflow-hidden">
                <app-event-info-item
                  icon="map-pin"
                  label="Adres"
                  size="xs"
                  [value]="_event.address"
                />
              </div>
              <div class="hidden sm:contents">
                <app-event-info-item
                  icon="calendar"
                  label="Termin"
                  size="xs"
                  [value]="eventDateRangeLabel()"
                />
              </div>
              <app-event-info-item
                icon="clock"
                label="Czas"
                size="xs"
                [value]="_event.startsAt | eventDuration: _event.endsAt"
              />
              <app-event-info-item
                [icon]="_event.costPerPerson > 0 ? 'credit-card' : 'check-circle'"
                label="Koszt"
                size="xs"
                color="success"
                [value]="
                  _event.costPerPerson > 0
                    ? (_event.costPerPerson | number: '1.0-2') + ' zł'
                    : 'Bezpłatne'
                "
              />
            </div>

            <div class="flex items-center justify-between">
              <app-event-capacity-progress
                class="flex-1"
                [event]="_event"
                [isPreEnrollment]="isPreEnrollment()"
                [isJoinable]="isJoinable()"
                [isCancelled]="isCancelled()"
              />
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

        <div class="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
          <app-event-status-badge
            [variant]="statusBadgeVariant()"
            [label]="statusBadgeLabel()"
            [ended]="isEnded()"
            [canceled]="isCancelled()"
          />
          @if (_event.seriesId) {
            <span
              class="inline-flex items-center gap-1 rounded-full bg-primary-600/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white backdrop-blur-sm"
              aria-label="Wydarzenie z serii"
              title="Wydarzenie z serii"
            >
              <app-icon name="repeat" size="xs" class="text-white" />
              seria
            </span>
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

  readonly isCancelled = computed(() => {
    return this.event().status === EventStatus.CANCELLED;
  });

  readonly isEnded = computed(() => {
    const cd = this.countdown();
    if (cd?.isEnded) return true;
    // Sprawdź czy wydarzenie już się zakończyło (starsze niż 24h)
    const end = new Date(this.event().endsAt).getTime();
    const nowMs = this.now().getTime();
    return end <= nowMs;
  });

  private readonly now = signal(nowInZone().toJSDate());

  readonly isOngoing = computed(() => {
    if (this.isCancelled()) return false;
    const start = new Date(this.event().startsAt).getTime();
    const end = new Date(this.event().endsAt).getTime();
    const nowMs = this.now().getTime();
    return nowMs >= start && nowMs < end;
  });
  private intervalId?: number;

  readonly coverUrl = computed(() => {
    const cover = this.event().coverImage;
    return cover ? buildCoverImageUrl(cover) : null;
  });

  // Faktyczny src obrazka: resetuje się przy zmianie eventu, a przy błędzie
  // ładowania (np. 404 starego covera) podmienia się na bundlowany default.
  readonly coverSrc = linkedSignal(() => this.coverUrl());

  readonly countdown = computed(() =>
    getEventCountdown(this.event().startsAt, this.event().endsAt),
  );

  readonly isPreEnrollment = computed(() => {
    const e = this.event();
    return isPreEnrollment(e.startsAt, e.lotteryExecutedAt, e.status);
  });

  readonly isJoinable = computed(() => {
    const e = this.event();
    return isEventJoinable(e.startsAt, e.status);
  });

  readonly eventMonth = computed(() => formatMonthShort(this.event().startsAt));

  readonly eventDay = computed(() => getDayOfMonth(this.event().startsAt).toString());

  readonly eventStartTime = computed(() => formatTime(this.event().startsAt));

  readonly eventDateRangeLabel = computed(() =>
    formatDateRangeLabel(this.event().startsAt, this.event().endsAt),
  );

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

  readonly statusBadgeVariant = computed(() => {
    if (this.isOngoing()) return 'ongoing';
    const cd = this.countdown();
    if (cd) return cd.isUrgent ? 'countdown-urgent' : 'countdown-soon';
    return 'days';
  });

  readonly statusBadgeLabel = computed(() => {
    if (this.isOngoing()) return 'TRWA';
    const cd = this.countdown();
    if (cd) return this.countdownLabel();
    return this.badgeLabel();
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

  onCoverImageError(): void {
    if (this.coverSrc() === DEFAULT_COVER_IMAGE_URL) return;
    this.coverSrc.set(DEFAULT_COVER_IMAGE_URL);
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
