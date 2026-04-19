import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from '../icon/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';
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
          class="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-default"
          (click)="onCancel()"
          aria-label="Zamknij"
        ></button>

        <!-- Modal -->
        <div class="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl animate-modal-in">
          <div class="px-6 pt-6 pb-2 text-center">
            <div
              [ngClass]="
                'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ' +
                iconBgClass()
              "
            >
              <app-icon [name]="iconName()" size="lg" [ngClass]="iconColorClass()"></app-icon>
            </div>

            <h2 class="text-lg font-bold text-neutral-900">
              {{ s.title }}
            </h2>
            <p class="mt-2 text-sm text-neutral-500 leading-relaxed">
              {{ s.message }}
            </p>
          </div>

          <div class="flex gap-3 px-6 pb-6 pt-4">
            <button
              type="button"
              class="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              (click)="onCancel()"
            >
              {{ s.cancelLabel || 'Nie' }}
            </button>
            <button
              type="button"
              [ngClass]="
                'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ' +
                confirmBtnClass()
              "
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
  readonly resolvedColor = computed<SemanticColor>(() => this.state()?.color ?? 'info');

  readonly iconName = computed<IconName>(() => {
    const color = this.resolvedColor();
    const map: Record<SemanticColor, IconName> = {
      primary: 'help-circle',
      success: 'check-circle',
      danger: 'alert-triangle',
      warning: 'alert-triangle',
      info: 'help-circle',
      neutral: 'help-circle',
    };
    return map[color];
  });

  readonly iconBgClass = computed(() => {
    return SEMANTIC_COLOR_CLASSES.surface[this.resolvedColor()];
  });

  readonly iconColorClass = computed(() => {
    return SEMANTIC_COLOR_CLASSES.textStrong[this.resolvedColor()];
  });

  readonly confirmBtnClass = computed(() => {
    return SEMANTIC_COLOR_CLASSES.button[this.resolvedColor()];
  });

  onConfirm(): void {
    this.confirmModal.respond(true);
  }

  onCancel(): void {
    this.confirmModal.respond(false);
  }
}
