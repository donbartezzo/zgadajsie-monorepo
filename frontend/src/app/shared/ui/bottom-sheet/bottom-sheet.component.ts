import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';

@Component({
  selector: 'app-bottom-sheet',
  imports: [CommonModule, IconComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex flex-col justify-end">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          (click)="closed.emit()"
        ></div>

        <!-- Sheet -->
        <div
          class="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-slate-800 animate-slide-up"
        >
          <!-- Handle + header -->
          <div class="sticky top-0 z-10 bg-white dark:bg-slate-800 px-4 pt-3 pb-2">
            <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600"></div>
            @if (title()) {
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ title() }}</h2>
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  (click)="closed.emit()"
                  aria-label="Zamknij"
                >
                  <app-icon name="x" size="sm" />
                </button>
              </div>
            }
          </div>

          <!-- Content -->
          <div class="px-4 pb-6">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    :host {
      display: contents;
    }
    .animate-slide-up {
      animation: slideUp 0.3s ease-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();
}
