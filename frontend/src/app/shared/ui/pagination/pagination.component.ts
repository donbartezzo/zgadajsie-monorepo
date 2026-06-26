import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule, ButtonComponent],
  template: `
    @if (totalPages() > 1) {
      <div class="flex items-center justify-center gap-1">
        <app-button
          appearance="ghost"
          color="neutral"
          size="sm"
          [iconOnly]="true"
          iconLeft="chevron-left"
          [disabled]="currentPage() <= 1"
          (clicked)="pageChange.emit(currentPage() - 1)"
        />

        @for (page of visiblePages(); track page) {
          @if (page === -1) {
            <span class="px-2 text-neutral-400">…</span>
          } @else {
            <app-button
              size="sm"
              [appearance]="page === currentPage() ? 'solid' : 'ghost'"
              [color]="page === currentPage() ? 'primary' : 'neutral'"
              (clicked)="pageChange.emit(page)"
            >
              {{ page }}
            </app-button>
          }
        }

        <app-button
          appearance="ghost"
          color="neutral"
          size="sm"
          [iconOnly]="true"
          iconLeft="chevron-right"
          [disabled]="currentPage() >= totalPages()"
          (clicked)="pageChange.emit(currentPage() + 1)"
        />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly currentPage = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });
}
