import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Event } from '../../types';
import { IconComponent } from '../../../core/icons/icon.component';

@Component({
  selector: 'app-event-hero',
  imports: [IconComponent],
  host: { class: 'block relative w-full shrink-0', style: 'height: var(--hero-h, 300px)' },
  template: `
    @let e = event();
    <div class="fixed inset-x-0 top-0 z-0 max-w-app mx-auto" style="height: var(--hero-h, 300px)">
      @if (e?.coverImageUrl) {
      <img [src]="e!.coverImageUrl" [alt]="e!.title" class="h-full w-full object-cover" />
      } @else {
      <div
        class="h-full w-full bg-gradient-to-br from-highlight-light to-highlight flex items-center justify-center"
      >
        <app-icon name="calendar" size="lg" variant="default"></app-icon>
      </div>
      }

      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

      <!-- Date badge — top right -->
      @if (e) {
      <div class="absolute top-3 right-3">
        <div class="overflow-hidden rounded-lg bg-white shadow-xl text-center dark:bg-slate-800">
          <span
            class="block bg-highlight px-3 py-0.5 text-[10px] font-semibold uppercase leading-tight text-white"
            >{{ month() }}</span
          >
          <span class="block px-3 py-1 text-xl font-extrabold text-gray-900 dark:text-gray-100">{{
            day()
          }}</span>
        </div>
      </div>
      }

      <!-- Bottom overlay content -->
      <div class="absolute inset-x-0 bottom-9 p-4">
        <!-- Badges -->
        @if (e) {
        <div class="mb-2 flex flex-wrap gap-1.5">
          @if (e.discipline) {
          <span
            class="rounded-sm bg-highlight px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            >{{ e.discipline!.name }}</span
          >
          } @if (e.level) {
          <span
            class="rounded-sm bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            >{{ e.level!.name }}</span
          >
          } @if (e.facility) {
          <span
            class="rounded-sm bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-white backdrop-blur-sm"
            >{{ e.facility!.name }}</span
          >
          }
        </div>
        }

        <h1 class="text-2xl font-extrabold text-white leading-tight">
          {{ e?.title ?? '' }}
        </h1>

        <p class="mt-0.5 text-sm text-white/60">{{ subtitle() }}</p>
      </div>

      <!-- Projected action slot (e.g. "Dołącz" button) -->
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventHeroComponent {
  readonly event = input<Event | null>(null);
  readonly subtitle = input('');

  readonly month = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase();
  });

  readonly day = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).getDate().toString();
  });
}
