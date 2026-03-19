import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { DateBadgeComponent } from '../date-badge/date-badge.component';
import { EventStatusBadgeComponent } from '../event-status-badge/event-status-badge.component';
import { EventListItem } from '../../types';
import { coverImageUrl } from '../../types/cover-image.interface';
import { getEventCountdown, getRelativeDateLabel } from '../../utils/date.utils';
import { MILLISECONDS_PER_HOUR } from '@zgadajsie/shared';

@Component({
  selector: 'app-event-card',
  imports: [
    DecimalPipe,
    IconComponent,
    UserAvatarComponent,
    DateBadgeComponent,
    EventStatusBadgeComponent,
  ],
  template: `
    @let _event = event(); @let _countdown = countdown();
    <div
      [class]="
        'rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white border-2 ' +
        borderClass()
      "
      (click)="selected.emit(_event)"
    >
      <!-- Cover hero -->
      <div class="relative h-44 overflow-hidden">
        @if (_event.coverImage?.filename) {
        <img
          [src]="coverUrl()"
          [alt]="_event.title"
          class="absolute inset-0 h-full w-full object-cover"
        />
        } @else {
        <div class="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-500"></div>
        }

        <!-- Gradient overlay -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        ></div>

        <!-- Status badge (top-left) -->
        <div class="absolute left-2 top-2 z-10">
          @if (isOngoing()) {
          <app-event-status-badge variant="ongoing" label="TRWA" />
          } @else if (_countdown) {
          <app-event-status-badge
            [variant]="_countdown.isUrgent ? 'countdown-urgent' : 'countdown-soon'"
            [label]="_countdown.label"
          />
          } @else {
          <app-event-status-badge variant="date" [label]="badgeLabel()" />
          }
        </div>

        <!-- Mini calendar (top-right) -->
        <div class="absolute right-2 top-2">
          <app-date-badge
            [month]="eventMonth()"
            [day]="eventDay()"
            [time]="eventStartTime()"
            size="sm"
          />
        </div>

        <!-- Title + badges (bottom-left) -->
        <div class="absolute inset-x-0 bottom-0 p-3">
          <h3 class="text-sm font-bold text-white line-clamp-2 drop-shadow-sm">
            {{ _event.title }}
          </h3>
          <div class="mt-1 flex flex-wrap gap-1">
            @if (_event.discipline) {
            <span
              class="rounded-sm bg-primary-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
              >{{ _event.discipline!.name }}</span
            >
            } @if (_event.level) {
            <span
              class="rounded-sm bg-warning-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
              >{{ _event.level!.name }}</span
            >
            } @if (_event.facility) {
            <span
              class="rounded-sm bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white backdrop-blur-sm"
              >{{ _event.facility!.name }}</span
            >
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-3 space-y-2">
        <div class="flex items-center gap-1 text-sm text-neutral-500">
          <app-icon name="map-pin" size="sm" variant="muted" />
          <span class="truncate">{{ _event.address }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span class="flex items-center gap-1">
            <app-icon name="clock" size="xs" variant="muted" />
            {{ eventStartTime() }}–{{ eventEndTime() }} ({{ duration() }})
          </span>
          <span class="flex items-center gap-1">
            <app-icon name="users" size="xs" variant="muted" />
            {{ genderLabel() }}
          </span>
        </div>

        @if (rulesList().length > 0) {
        <div class="text-sm">
          <div class="flex items-center gap-1 text-neutral-900 font-medium mb-1">
            <app-icon name="check-circle" size="sm" variant="muted" />
            Zasady
          </div>
          <div class="text-neutral-500 text-xs space-y-0.5 ml-5">
            @for (rule of rulesList().slice(0, 3); track $index) {
            <div class="truncate">{{ rule }}</div>
            } @if (rulesList().length > 3) {
            <div class="text-neutral-500">...</div>
            }
          </div>
        </div>
        }

        <div class="flex items-center justify-between pt-2 border-t border-neutral-200">
          <div class="flex items-center gap-2">
            @if (_event.organizer) {
            <app-user-avatar
              [avatarUrl]="_event.organizer!.avatarUrl"
              [displayName]="_event.organizer!.displayName"
              size="sm"
            />
            <span class="text-sm text-neutral-900">{{ _event.organizer!.displayName }}</span>
            }
          </div>
          <div class="flex items-center gap-3 text-sm">
            @if (_event._count) {
            <span class="flex items-center gap-1 text-neutral-500">
              <app-icon name="users" size="sm" variant="muted" />
              {{ _event._count!.participations }}@if (_event.maxParticipants) {/{{
                _event.maxParticipants
              }}}
            </span>
            } @if (_event.costPerPerson > 0) {
            <span class="font-semibold text-success-400"
              >{{ _event.costPerPerson | number : '1.0-2' }} zł</span
            >
            } @else {
            <span class="font-semibold text-success-400">Bezpłatne</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent implements OnDestroy {
  readonly event = input.required<EventListItem>();
  readonly isOngoing = input(false);
  readonly dateLabel = input<string | null>(null);
  readonly selected = output<EventListItem>();

  private readonly now = signal(new Date());
  private intervalId?: number;

  readonly coverUrl = computed(() => {
    const filename = this.event().coverImage?.filename;
    return filename ? coverImageUrl(filename) : '';
  });

  readonly isToday = computed(() => {
    const d = new Date(this.event().startsAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  readonly countdown = computed(() =>
    getEventCountdown(this.event().startsAt, this.event().endsAt, this.now()),
  );

  readonly borderClass = computed(() => {
    if (this.isOngoing()) return 'border-success-400';
    const cd = this.countdown();
    if (cd?.isUrgent) return 'border-warning-400';
    if (cd) return 'border-info-400';
    if (this.isToday()) return 'border-danger-400';
    return 'border-neutral-200';
  });

  readonly eventMonth = computed(() =>
    new Date(this.event().startsAt).toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase(),
  );

  readonly eventDay = computed(() => new Date(this.event().startsAt).getDate().toString());

  readonly eventStartTime = computed(() =>
    new Date(this.event().startsAt).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  readonly eventEndTime = computed(() =>
    new Date(this.event().endsAt).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  readonly duration = computed(() => {
    const start = new Date(this.event().startsAt).getTime();
    const end = new Date(this.event().endsAt).getTime();
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  });

  readonly genderLabel = computed(() => {
    const g = this.event().gender;
    if (!g || g === 'ANY') return 'Wszyscy';
    if (g === 'MALE') return 'Mężczyźni';
    if (g === 'FEMALE') return 'Kobiety';
    return g;
  });

  readonly rulesList = computed(() => {
    const rules = this.event().rules;
    if (!rules?.trim()) return [];
    return rules.split('\n').filter((r) => r.trim());
  });

  readonly badgeLabel = computed(() => {
    const label = this.dateLabel();
    if (label) return label;
    return getRelativeDateLabel(new Date(this.event().startsAt));
  });

  constructor() {
    effect(() => {
      const evt = this.event();
      const start = new Date(evt.startsAt).getTime();
      const nowMs = this.now().getTime();
      const hoursUntil = (start - nowMs) / MILLISECONDS_PER_HOUR;

      if (hoursUntil > 0 && hoursUntil <= 24) {
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
    this.intervalId = window.setInterval(() => {
      this.now.set(new Date());
    }, 60000);
  }

  private stopCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
