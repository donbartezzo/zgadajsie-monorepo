import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  EventStatusBarConfig,
  EventStatusBarItemComponent,
} from '../event-status-bar-item/event-status-bar-item.component';

@Component({
  selector: 'app-event-status-bar-sticky',
  imports: [EventStatusBarItemComponent],
  template: `
    <div
      class="fixed bottom-[calc(var(--footer-height)+env(safe-area-inset-bottom))] inset-x-0 z-30 max-w-app mx-auto animate-slide-up-bar"
    >
      @for (bar of bars(); track bar.id) {
        <app-event-status-bar-item
          [bar]="bar"
          [variant]="'sticky'"
          (barClick)="barClick.emit(bar.id)"
        />
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
export class EventStatusBarStickyComponent {
  readonly bars = input.required<EventStatusBarConfig[]>();
  readonly barClick = output<string>();
}
