import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { ExplainerService } from './explainer.service';

const POPOVER_WIDTH = 256;
const POPOVER_OFFSET = 10;
const EDGE_MARGIN = 8;
const ARROW_HALF = 5;

@Component({
  selector: 'app-explainer',
  template: `
    @let s = state();
    @if (s) {
      <div class="fixed inset-0 z-[89]" aria-hidden="true" (click)="close()"></div>

      <div
        class="fixed z-[90] w-64 rounded-xl bg-white shadow-xl border border-neutral-200 p-4 text-center animate-fade-in"
        [style]="popoverStyle()"
        role="tooltip"
      >
        <span
          class="absolute w-2.5 h-2.5 bg-white rotate-45"
          [class]="arrowBorderClass()"
          [style.left.px]="arrowLeft()"
        ></span>

        <p class="text-md font-semibold text-neutral-900 uppercase tracking-wide mb-1">
          {{ s.title }}
        </p>
        <p class="text-sm text-neutral-700 leading-relaxed">{{ s.description }}</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplainerComponent {
  private readonly explainerService = inject(ExplainerService);
  readonly state = computed(() => this.explainerService.state());

  readonly showAbove = computed(() => {
    const s = this.state();
    return !s || s.anchor.top > 180;
  });

  readonly popoverLeft = computed(() => {
    const s = this.state();
    if (!s) return 0;
    const anchorCenterX = s.anchor.left + s.anchor.width / 2;
    return Math.max(
      EDGE_MARGIN,
      Math.min(anchorCenterX - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - EDGE_MARGIN),
    );
  });

  readonly popoverStyle = computed((): Record<string, string> => {
    const s = this.state();
    if (!s) return {};
    const left = this.popoverLeft();
    if (this.showAbove()) {
      return {
        top: `${s.anchor.top - POPOVER_OFFSET}px`,
        left: `${left}px`,
        transform: 'translateY(-100%)',
      };
    }
    return {
      top: `${s.anchor.bottom + POPOVER_OFFSET}px`,
      left: `${left}px`,
    };
  });

  readonly arrowLeft = computed(() => {
    const s = this.state();
    if (!s) return EDGE_MARGIN;
    const anchorCenterX = s.anchor.left + s.anchor.width / 2;
    return Math.max(
      EDGE_MARGIN,
      Math.min(anchorCenterX - this.popoverLeft() - ARROW_HALF, POPOVER_WIDTH - EDGE_MARGIN * 2),
    );
  });

  readonly arrowBorderClass = computed(() =>
    this.showAbove()
      ? 'border-b border-r border-neutral-200 -bottom-[5px]'
      : 'border-t border-l border-neutral-200 -top-[5px]',
  );

  close(): void {
    this.explainerService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.explainerService.close();
  }
}
