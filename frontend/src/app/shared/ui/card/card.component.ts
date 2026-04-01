import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { class: 'block' },
  template: `
    <div class="bg-white rounded-2xl shadow-xs border border-neutral-100 overflow-hidden p-4">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
