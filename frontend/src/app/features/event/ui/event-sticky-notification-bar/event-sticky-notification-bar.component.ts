import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { NotificationBarConfig } from '../event-inline-notification-bars/event-inline-notification-bars.component';

@Component({
  selector: 'app-event-sticky-notification-bar',
  imports: [IconComponent, ButtonComponent],
  template: `
    <div
      class="fixed bottom-[var(--footer-height)] inset-x-0 z-30 max-w-app mx-auto animate-slide-up-bar"
    >
      @for (bar of bars(); track bar.id) {
        <div class="{{ bar.bgClass }} {{ bar.borderClass }} px-3 py-1">
          <div class="flex items-center gap-3">
            <app-icon [name]="bar.icon" size="xs" [class]="bar.iconColorClass"></app-icon>
            <div class="flex-1 min-w-0">
              <p
                class="font-semibold truncate text-xs {{
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
export class EventStickyNotificationBarComponent {
  readonly bars = input<NotificationBarConfig[]>([]);
  readonly barAction = output<string>();
}
