import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from '../../../core/icons/icon.component';
import { ConfirmModalService } from './confirm-modal.service';

@Component({
  selector: 'app-confirm-modal',
  imports: [CommonModule, IconComponent],
  template: `
    @if (state(); as s) {
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 max-w-app mx-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <button
        type="button"
        class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        (click)="onCancel()"
        aria-label="Zamknij"
      ></button>

      <!-- Modal -->
      <div
        class="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-slate-800 animate-modal-in"
      >
        <div class="px-6 pt-6 pb-2 text-center">
          <div
            [ngClass]="'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ' + iconBgClass()"
          >
            <app-icon
              [name]="iconName()"
              size="lg"
              [ngClass]="iconColorClass()"
            ></app-icon>
          </div>

          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">
            {{ s.title }}
          </h2>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {{ s.message }}
          </p>
        </div>

        <div class="flex gap-3 px-6 pb-6 pt-4">
          <button
            type="button"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
            (click)="onCancel()"
          >
            {{ s.cancelLabel || 'Nie' }}
          </button>
          <button
            type="button"
            [ngClass]="'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ' + confirmBtnClass()"
            (click)="onConfirm()"
          >
            {{ s.confirmLabel || 'Tak' }}
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      @keyframes modalIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      .animate-modal-in {
        animation: modalIn 0.2s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModalComponent {
  private readonly confirmModal = inject(ConfirmModalService);

  readonly state = this.confirmModal.state;

  readonly iconName = computed<IconName>(() => {
    const variant = this.state()?.variant ?? 'info';
    const map: Record<string, IconName> = {
      danger: 'alert-triangle',
      warning: 'alert-triangle',
      info: 'help-circle',
    };
    return map[variant] ?? 'help-circle';
  });

  readonly iconBgClass = computed(() => {
    const variant = this.state()?.variant ?? 'info';
    const map: Record<string, string> = {
      danger: 'bg-red-100 dark:bg-red-900/30',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30',
      info: 'bg-blue-100 dark:bg-blue-900/30',
    };
    return map[variant] ?? map['info'];
  });

  readonly iconColorClass = computed(() => {
    const variant = this.state()?.variant ?? 'info';
    const map: Record<string, string> = {
      danger: 'text-red-500 dark:text-red-400',
      warning: 'text-yellow-500 dark:text-yellow-400',
      info: 'text-blue-500 dark:text-blue-400',
    };
    return map[variant] ?? map['info'];
  });

  readonly confirmBtnClass = computed(() => {
    const variant = this.state()?.variant ?? 'info';
    const map: Record<string, string> = {
      danger: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
      warning: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-400 dark:hover:bg-yellow-500',
      info: 'bg-highlight hover:bg-highlight-dark dark:bg-highlight-light dark:hover:bg-highlight',
    };
    return map[variant] ?? map['info'];
  });

  onConfirm(): void {
    this.confirmModal.respond(true);
  }

  onCancel(): void {
    this.confirmModal.respond(false);
  }
}
