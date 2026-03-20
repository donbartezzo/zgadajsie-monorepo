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
import { IconComponent, IconName } from '../../../ui/icon/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../../types/colors';

@Component({
  selector: 'app-bottom-overlay',
  imports: [CommonModule, IconComponent],
  template: `
    @if (open()) {
    <div class="fixed inset-x-0 top-0 bottom-16 z-[60] flex flex-col max-w-app mx-auto">
      <button
        type="button"
        class="absolute inset-0 m-0 border-0 bg-black/50 p-0 backdrop-blur-sm"
        (click)="closed.emit()"
        aria-label="Zamknij overlay"
      ></button>

      <button
        type="button"
        class="relative z-10 m-0 min-h-0 flex-1 border-0 bg-transparent p-0"
        (click)="closed.emit()"
        aria-label="Zamknij overlay"
      ></button>

      <div
        class="relative z-10 min-h-0 overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-slide-up"
      >
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
          <button
            type="button"
            class="absolute top-1 right-3 grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100"
            (click)="closed.emit()"
            aria-label="Zamknij"
          >
            <app-icon name="x" size="sm" />
          </button>
        </div>

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
  readonly iconColor = input<SemanticColor>('info');
  readonly closed = output<void>();

  protected readonly iconBgClass = computed(() => SEMANTIC_COLOR_CLASSES.surface[this.iconColor()]);
  protected readonly iconTextClass = computed(() => SEMANTIC_COLOR_CLASSES.text[this.iconColor()]);

  constructor() {
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
