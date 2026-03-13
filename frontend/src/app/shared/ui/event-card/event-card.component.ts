import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { DateBadgeComponent } from '../date-badge/date-badge.component';
import { EventListItem } from '../../types';
import { coverImageUrl } from '../../types/cover-image.interface';

@Component({
  selector: 'app-event-card',
  imports: [CommonModule, DecimalPipe, IconComponent, UserAvatarComponent, DateBadgeComponent],
  template: `
    <div
      [class]="
        'rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800 border-2 ' +
        (isOngoing()
          ? 'border-green-400 dark:border-green-500'
          : isToday()
            ? 'border-red-400 dark:border-red-500'
            : 'border-gray-200 dark:border-slate-700')
      "
      (click)="selected.emit(event())"
    >
      <!-- Cover hero -->
      <div class="relative h-44 overflow-hidden">
        @if (event().coverImage?.filename) {
        <img
          [src]="coverUrl()"
          [alt]="event().title"
          class="absolute inset-0 h-full w-full object-cover"
        />
        } @else {
        <div class="absolute inset-0 bg-gradient-to-br from-highlight-light to-highlight"></div>
        }

        <!-- Gradient overlay -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        ></div>

        <!-- "Trwa" badge (top-left) -->
        @if (isOngoing()) {
        <div class="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-1 shadow-lg">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
          <span class="text-[10px] font-bold uppercase tracking-wide text-white">Trwa</span>
        </div>
        }

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
            {{ event().title }}
          </h3>
          <div class="mt-1 flex flex-wrap gap-1">
            @if (event().discipline) {
            <span
              class="rounded-sm bg-highlight px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
              >{{ event().discipline!.name }}</span
            >
            } @if (event().level) {
            <span
              class="rounded-sm bg-orange-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
              >{{ event().level!.name }}</span
            >
            } @if (event().facility) {
            <span
              class="rounded-sm bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white backdrop-blur-sm"
              >{{ event().facility!.name }}</span
            >
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-3 space-y-2">
        <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <app-icon name="map-pin" size="sm" variant="muted" />
          <span class="truncate">{{ event().address }}</span>
        </div>

        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
        >
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
          <div class="flex items-center gap-1 text-gray-600 dark:text-gray-300 font-medium mb-1">
            <app-icon name="check-circle" size="sm" variant="muted" />
            Zasady
          </div>
          <div class="text-gray-600 dark:text-gray-400 text-xs space-y-0.5 ml-5">
            @for (rule of rulesList().slice(0, 3); track $index) {
            <div class="truncate">{{ rule }}</div>
            } @if (rulesList().length > 3) {
            <div class="text-gray-500 dark:text-gray-500">...</div>
            }
          </div>
        </div>
        }

        <div
          class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700"
        >
          <div class="flex items-center gap-2">
            @if (event().organizer) {
            <app-user-avatar
              [avatarUrl]="event().organizer!.avatarUrl"
              [displayName]="event().organizer!.displayName"
              size="sm"
            />
            <span class="text-sm text-gray-600 dark:text-gray-300">{{
              event().organizer!.displayName
            }}</span>
            }
          </div>
          <div class="flex items-center gap-3 text-sm">
            @if (event()._count) {
            <span class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <app-icon name="users" size="sm" variant="muted" />
              {{ event()._count!.participations }}@if (event().maxParticipants) {/{{
                event().maxParticipants
              }}}
            </span>
            } @if (event().costPerPerson > 0) {
            <span class="font-semibold text-green-600 dark:text-green-400"
              >{{ event().costPerPerson | number : '1.0-2' }} zł</span
            >
            } @else {
            <span class="font-semibold text-green-600 dark:text-green-400">Bezpłatne</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  readonly event = input.required<EventListItem>();
  readonly isOngoing = input(false);
  readonly selected = output<EventListItem>();

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
}
