import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';
import { EventHeroComponent } from '../event-hero/event-hero.component';
import { Event as EventModel } from '../../types';

@Component({
  selector: 'app-event-subpage-layout',
  imports: [RouterLink, IconComponent, EventHeroComponent],
  // host: {
  //   class: 'flex-1 flex flex-col min-h-0',
  //   style: '--hero-h: 180px; --content-h: calc(100vh - var(--hero-h))',
  // },
  template: `
    <app-event-hero [event]="event()" />

    <div
      class="relative z-10 -mt-6 flex-1 flex flex-col min-h-screen bg-white dark:bg-slate-800 rounded-t-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
    >
      <header
        class="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700"
      >
        <a [routerLink]="['/events', event()?.id]" class="text-gray-500 dark:text-gray-400">
          <app-icon name="arrow-left" size="sm"></app-icon>
        </a>
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {{ title() }}
          </h2>
          @if (subtitle(); as sub) {
          <p class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {{ sub }}
          </p>
          }
        </div>
        <ng-content select="[headerActions]" />
      </header>

      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSubpageLayoutComponent {
  readonly event = input<EventModel | null>(null);
  readonly title = input('');
  readonly subtitle = input('');
}
