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
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SemanticColor } from '../../../../shared/types/colors';
import { EventStickyNotificationBarComponent } from '../event-sticky-notification-bar/event-sticky-notification-bar.component';

export interface NotificationBarConfig {
  id: string;
  icon: IconName;
  iconColorClass: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  bgClass: string;
  borderClass: string;
  titleColorClass?: string;
  subtitleColorClass?: string;
  buttonAppearance?: 'outline' | 'soft' | 'ghost';
  buttonColor?: SemanticColor;
}

const BOTTOM_NAV_HEIGHT = 120;

@Component({
  selector: 'app-event-inline-notification-bars',
  imports: [IconComponent, ButtonComponent, EventStickyNotificationBarComponent],
  template: `
    <!-- Sentinel: always in DOM, observed by IntersectionObserver -->
    <div #barsSentinel class="h-0 w-full"></div>

    <!-- Inline bars -->
    <div>
      @for (bar of bars(); track bar.id) {
        <div class="relative z-10 overflow-hidden -mx-4 {{ bar.bgClass }} {{ bar.borderClass }}">
          <div class="px-4 py-3">
            <div class="flex items-center gap-3">
              <app-icon [name]="bar.icon" size="md" [class]="bar.iconColorClass"></app-icon>
              <div class="flex-1 min-w-0">
                <p
                  class="font-semibold truncate text-md {{
                    bar.titleColorClass || 'text-neutral-900'
                  }}"
                >
                  {{ bar.title }}
                </p>
                <p class="text-[10px] {{ bar.subtitleColorClass || 'text-neutral-500' }}">
                  {{ bar.subtitle }}
                </p>
              </div>
              <app-button
                [appearance]="bar.buttonAppearance || 'outline'"
                [color]="bar.buttonColor || 'neutral'"
                size="sm"
                (clicked)="barAction.emit(bar.id)"
                class="shrink-0"
                [attr.data-testid]="bar.id + '-button'"
              >
                {{ bar.buttonLabel }}
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Sticky bar: shown when inline bars scroll out of viewport -->
    @if (!sentinelVisible()) {
      <app-event-sticky-notification-bar [bars]="bars()" (barAction)="barAction.emit($event)" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInlineNotificationBarsComponent implements AfterViewInit, OnDestroy {
  private sentinelObserver: IntersectionObserver | null = null;

  readonly barsSentinel = viewChild<ElementRef<HTMLElement>>('barsSentinel');

  readonly bars = input<NotificationBarConfig[]>([]);
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
