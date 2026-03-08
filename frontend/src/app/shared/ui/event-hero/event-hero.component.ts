import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { Event } from '../../types';

@Component({
  selector: 'app-event-hero',
  imports: [],
  host: { class: 'block relative w-full shrink-0', style: 'height: var(--hero-h)' },
  template: `
    @let e = event(); @let hidden = heroHidden();

    <!-- Date badge — always visible, high z-index -->
    @if (e) {
    <div class="fixed top-2 right-2 z-[51] mx-auto max-w-app">
      <div class="overflow-hidden rounded-lg bg-white shadow-xl text-center dark:bg-slate-800">
        <span
          class="block bg-highlight px-3 py-0.5 text-[10px] font-semibold uppercase leading-tight text-white"
          >{{ month() }}</span
        >
        <span class="block text-xl font-extrabold text-gray-900 dark:text-gray-100">{{
          day()
        }}</span>
        <span class="block text-xs font-medium text-gray-600 dark:text-gray-400">{{
          startTime()
        }}</span>
      </div>
    </div>
    }

    <div
      [class]="
        'fixed inset-x-0 top-0 mx-auto max-w-app ' +
        (hidden
          ? 'z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border-b border-gray-200 dark:border-slate-700'
          : 'z-0')
      "
      [style.height]="hidden ? 'auto' : 'var(--hero-h)'"
    >
      @if (hidden && e) {
      <!-- Mini-bar content -->
      <div class="flex items-center gap-3 px-4 py-2">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{{ e.title }}</p>
          <div class="flex items-center gap-1.5 mt-0.5">
            @if (e.discipline) {
            <span
              class="rounded-sm bg-highlight px-1.5 py-px text-[9px] font-semibold uppercase text-white"
              >{{ e.discipline!.name }}</span
            >
            }
            <span class="text-[10px] text-gray-400 dark:text-gray-500"
              >{{ day() }} {{ month() }}</span
            >
          </div>
        </div>
      </div>
      } @else {
      <!-- Hero content -->
      @if (e?.coverImage?.url) {
      <img [src]="e!.coverImage!.url" [alt]="e!.title" class="h-full w-full object-cover" />
      } @else {
      <div
        class="h-full w-full bg-gradient-to-br from-highlight-light to-highlight flex items-center justify-center"
      ></div>
      }

      <div
        class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
      ></div>

      <!-- Bottom overlay content -->
      <div class="absolute inset-x-0 bottom-9 p-4">
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

        <h1 class="text-sm font-extrabold text-white leading-tight">
          {{ e?.title ?? '' }}
        </h1>
      </div>

      <ng-content />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventHeroComponent implements OnInit {
  private readonly elRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly event = input<Event | null>(null);

  readonly heroHidden = signal(false);

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

  readonly startTime = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  });

  ngOnInit(): void {
    const observer = new IntersectionObserver(
      ([entry]) => this.heroHidden.set(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' },
    );
    observer.observe(this.elRef.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
