import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { EventStatusBarStickyComponent } from '../event-status-bar-sticky/event-status-bar-sticky.component';
import {
  EventStatusBarConfig,
  EventStatusBarItemComponent,
} from '../event-status-bar-item/event-status-bar-item.component';

export type { EventStatusBarConfig };

const BOTTOM_NAV_HEIGHT = 120;

@Component({
  selector: 'app-event-status-bars-inline',
  imports: [EventStatusBarItemComponent, EventStatusBarStickyComponent],
  template: `
    <!-- Sentinel: always in DOM, observed by IntersectionObserver -->
    <div #barsSentinel class="h-0 w-full"></div>

    <!-- Inline bars -->
    <div>
      @for (bar of bars(); track bar.id) {
        <app-event-status-bar-item
          [bar]="bar"
          variant="inline"
          (barAction)="barAction.emit($event)"
        />
      }
    </div>

    <!-- Sticky bar: shown when inline bars scroll out of viewport -->
    @if (!sentinelVisible()) {
      <app-event-status-bar-sticky [bars]="bars()" (barAction)="barAction.emit($event)" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBarsInlineComponent implements AfterViewInit, OnDestroy {
  private sentinelObserver: IntersectionObserver | null = null;

  readonly barsSentinel = viewChild<ElementRef<HTMLElement>>('barsSentinel');

  readonly bars = input<EventStatusBarConfig[]>([]);
  readonly barAction = output<string>();

  readonly sentinelVisible = signal(true);

  ngAfterViewInit(): void {
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.sentinelObserver?.disconnect();
  }

  private setupObserver(): void {
    const el = this.barsSentinel()?.nativeElement;
    if (!el) return;

    this.sentinelObserver = new IntersectionObserver(
      ([entry]) => this.sentinelVisible.set(entry.isIntersecting),
      { threshold: 0, rootMargin: `0px 0px -${BOTTOM_NAV_HEIGHT}px 0px` },
    );
    this.sentinelObserver.observe(el);
  }
}
