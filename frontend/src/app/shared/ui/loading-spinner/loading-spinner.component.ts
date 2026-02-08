import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../../core/icons/icon.component';

@Component({
  selector: 'app-loading-spinner',
  imports: [IconComponent],
  template: `
    <div class="flex items-center justify-center py-8">
      <app-icon name="loader" [size]="size()" variant="primary" class="animate-spin" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('lg');
}
