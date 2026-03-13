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
import { IconComponent, IconName } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

export interface NotificationBarConfig {
  id: string;
  icon: IconName;
  iconColorClass: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  bgClass: string;
  borderClass: string;
}

@Component({
  selector: 'app-event-notification-bars',
  imports: [IconComponent, ButtonComponent],
  template: `
    <!-- Inline sentinel bars -->
    <div #barsSentinel>
      @for (bar of bars(); track bar.id) {
      <div class="relative z-10 overflow-hidden -mx-4 {{ bar.bgClass }} {{ bar.borderClass }}">
        <div class="px-4 py-3">
          <div class="flex items-center gap-3">
            <app-icon [name]="bar.icon" size="md" [class]="bar.iconColorClass"></app-icon>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-neutral-900 truncate text-md">
                {{ bar.title }}
              </p>
              <p class="text-[10px] text-neutral-500">
                {{ bar.subtitle }}
              </p>
            </div>
            <app-button
              variant="outline"
              size="sm"
              (clicked)="barAction.emit(bar.id)"
              class="shrink-0"
            >
              {{ bar.buttonLabel }}
            </app-button>
          </div>
        </div>
      </div>
      }
    </div>

    <!-- Fixed sticky bars — visible only when sentinel scrolls out of viewport -->
    @if (!sentinelVisible()) {
    <div
      class="fixed bottom-[var(--footer-height)] inset-x-0 z-30 max-w-app mx-auto animate-slide-up-bar"
    >
      @for (bar of bars(); track bar.id) {
      <div class="{{ bar.bgClass }} {{ bar.borderClass }} px-3 py-1">
        <div class="flex items-center gap-3">
          <app-icon [name]="bar.icon" size="xs" [class]="bar.iconColorClass"></app-icon>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-neutral-900 truncate text-xs">
              {{ bar.title }}
            </p>
            <p class="text-[10px] text-neutral-500">
              {{ bar.subtitle }}
            </p>
          </div>
          <app-button
            variant="outline"
            size="xs"
            (clicked)="barAction.emit(bar.id)"
            class="shrink-0"
          >
            {{ bar.buttonLabel }}
          </app-button>
        </div>
      </div>
      }
    </div>
    }
  `,
  styles: [
    `
      @keyframes slideUpBar {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      :host ::ng-deep .animate-slide-up-bar {
        animation: slideUpBar 0.35s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventNotificationBarsComponent implements AfterViewInit, OnDestroy {
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
      { threshold: 0, rootMargin: '0px 0px -120px 0px' },
    );
    this.sentinelObserver.observe(el);
  }
}
