import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center p-4 max-w-app mx-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <button
        type="button"
        class="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-default border-0 m-0 p-0"
        (click)="closed.emit()"
        aria-label="Zamknij"
      ></button>

      <!-- Dialog -->
      <div
        class="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl animate-modal-in overflow-y-auto max-h-[calc(100dvh-2rem)]"
      >
        <!-- Close button -->
        <button
          type="button"
          class="absolute top-3 right-3 grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 z-10"
          (click)="closed.emit()"
          aria-label="Zamknij"
        >
          <app-icon name="x" size="sm" />
        </button>

        <!-- Content -->
        <div class="px-4 pt-4 pb-4">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes modalIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(8px);
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
export class ModalComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();

  constructor() {
    document.body.classList.add('overflow-hidden');
    this.destroyRef.onDestroy(() => {
      document.body.classList.remove('overflow-hidden');
    });
  }
}
