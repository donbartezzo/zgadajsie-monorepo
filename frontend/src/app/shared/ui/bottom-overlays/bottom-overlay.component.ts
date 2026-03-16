import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from '../../../core/icons/icon.component';

export type OverlayIconVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary';

const ICON_VARIANT_MAP: Record<OverlayIconVariant, { bg: string; text: string }> = {
  success: { bg: 'bg-success-50', text: 'text-success-400' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-400' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-300' },
  info: { bg: 'bg-info-50', text: 'text-info-400' },
  primary: { bg: 'bg-primary-50', text: 'text-primary-400' },
};

@Component({
  selector: 'app-bottom-overlay',
  imports: [CommonModule, IconComponent],
  template: `
    @if (open()) {
    <div class="fixed inset-x-0 top-0 bottom-16 z-[60] flex flex-col max-w-app mx-auto">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="closed.emit()"></div>

      <!-- Spacer — pushes sheet down when content is small, collapses when content is large -->
      <div class="relative z-10 flex-1 min-h-0" (click)="closed.emit()"></div>

      <!-- Sheet -->
      <div
        class="relative z-10 min-h-0 overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-slide-up"
      >
        <!-- Handle + header -->
        <div class="sticky top-0 z-10 bg-white px-4 pt-3 pb-2 rounded-t-2xl relative text-center">
          <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300"></div>
          @if (icon()) {
          <div
            [class]="
              'mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full ' +
              iconBgClass()
            "
          >
            <app-icon [name]="icon()!" size="lg" [class]="iconTextClass()"></app-icon>
          </div>
          } @if (title()) {
          <h2 class="text-lg font-bold text-neutral-900">{{ title() }}</h2>
          } @if (description()) {
          <p class="mt-1 text-sm text-neutral-500">{{ description() }}</p>
          }
          <!-- Close button - absolutely positioned -->
          <button
            type="button"
            class="absolute top-1 right-3 grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100"
            (click)="closed.emit()"
            aria-label="Zamknij"
          >
            <app-icon name="x" size="sm" />
          </button>
        </div>

        <!-- Content -->
        <div class="px-4 pb-6">
          <ng-content />
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      :host {
        display: contents;
      }
      .animate-slide-up {
        animation: slideUp 0.3s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomOverlayComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly title = input('');
  readonly description = input('');
  readonly icon = input<IconName | null>(null);
  readonly iconVariant = input<OverlayIconVariant>('info');
  readonly closed = output<void>();

  protected readonly iconBgClass = computed(() => ICON_VARIANT_MAP[this.iconVariant()].bg);
  protected readonly iconTextClass = computed(() => ICON_VARIANT_MAP[this.iconVariant()].text);

  constructor() {
    // Prevent body scroll when overlay is open - @TODO?
    effect(() => {
      if (this.open()) {
        document.body.classList.add('overflow-hidden');
      } else {
        document.body.classList.remove('overflow-hidden');
      }
    });

    this.destroyRef.onDestroy(() => {
      document.body.classList.remove('overflow-hidden');
    });
  }
}
