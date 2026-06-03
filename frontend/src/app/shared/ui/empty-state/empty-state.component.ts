import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <div
      class="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs"
    >
      <div class="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <app-icon [name]="icon()" size="lg" color="neutral" muted="light" />
      </div>
      <h3 class="text-lg font-semibold text-neutral-900 mb-1">{{ title() }}</h3>
      @if (message()) {
        <p class="text-sm text-neutral-500">{{ message() }}</p>
      }
      <div class="mt-4">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('search');
  readonly title = input('Brak wyników');
  readonly message = input('');
}
