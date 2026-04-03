import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-dialog',
  imports: [CommonModule, IconComponent],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 max-w-app mx-auto">
      <div
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs max-w-app mx-auto"
        (click)="closed.emit()"
      ></div>
      <div
        class="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto z-10"
      >
        <div class="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 class="text-lg font-semibold text-neutral-900">{{ title() }}</h2>
          <button
            class="p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            (click)="closed.emit()"
          >
            <app-icon name="x" size="sm" />
          </button>
        </div>
        <div class="p-4">
          <ng-content />
        </div>
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {
  readonly isOpen = input(false);
  readonly title = input('');
  readonly closed = output<void>();
}
