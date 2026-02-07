import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (totalPages() > 1) {
      <div class="flex items-center justify-center gap-1">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          [disabled]="currentPage() <= 1"
          (click)="pageChange.emit(currentPage() - 1)"
        >
          <app-icon name="chevron-left" size="sm" />
        </button>

        @for (page of visiblePages(); track page) {
          @if (page === -1) {
            <span class="px-2 text-gray-400">…</span>
          } @else {
            <button
              class="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
              [ngClass]="page === currentPage()
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'"
              (click)="pageChange.emit(page)"
            >{{ page }}</button>
          }
        }

        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          [disabled]="currentPage() >= totalPages()"
          (click)="pageChange.emit(currentPage() + 1)"
        >
          <app-icon name="chevron-right" size="sm" />
        </button>
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
