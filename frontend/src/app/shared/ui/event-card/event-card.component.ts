import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { EventListItem } from '../../types';

@Component({
  selector: 'app-event-card',
  imports: [CommonModule, DatePipe, DecimalPipe, IconComponent, UserAvatarComponent],
  template: `
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
      (click)="selected.emit(event())"
    >
      @if (event().coverImageUrl) {
      <img [src]="event().coverImageUrl" [alt]="event().title" class="w-full h-40 object-cover" />
      } @else {
      <div
        class="w-full h-40 bg-gradient-to-br from-highlight-light to-highlight flex items-center justify-center"
      >
        <app-icon name="calendar" size="lg" variant="default" />
      </div>
      }
      <div class="p-4 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {{ event().title }}
          </h3>
          @if (event().discipline) {
          <span
            class="text-xs bg-highlight-50 dark:bg-highlight-200/20 text-highlight dark:text-highlight-light px-2 py-0.5 rounded-full whitespace-nowrap"
            >{{ event().discipline!.name }}</span
          >
          }
        </div>
        <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <app-icon name="clock" size="sm" variant="muted" />
          <span>{{ event().startsAt | date : 'd MMM, HH:mm' }}</span>
        </div>
        <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <app-icon name="map-pin" size="sm" variant="muted" />
          <span class="truncate">{{ event().address }}</span>
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
            }
            @if (rulesList().length > 3) {
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
  readonly selected = output<EventListItem>();

  readonly rulesList = computed(() => {
    const rules = this.event().rules;
    if (!rules?.trim()) return [];
    return rules.split('\n').filter(r => r.trim());
  });
}
