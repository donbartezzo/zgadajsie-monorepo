import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChildren,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconName } from '../icon/icon.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { DataTableCellDirective } from './data-table-cell.directive';

export interface DataTableColumn<T = unknown> {
  key: string;
  header: string;
  accessor?: string | ((row: T) => unknown);
  align?: 'left' | 'right';
  nowrap?: boolean;
  hiddenOnMobile?: boolean;
  cellClass?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    DataTableCellDirective,
  ],
  templateUrl: './data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T> {
  readonly data = input.required<T[]>();
  readonly columns = input.required<DataTableColumn<T>[]>();
  readonly loading = input(false);
  readonly emptyMessage = input('');
  readonly emptyTitle = input('Brak wyników');
  readonly emptyIcon = input<IconName>('search');

  readonly currentPage = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();

  readonly trackByFn = input<(index: number, item: T) => string>((i) => i.toString());

  readonly cellDefs = contentChildren(DataTableCellDirective, { descendants: true });

  readonly cellTemplateMap = computed(() => {
    const map = new Map<string, TemplateRef<{ $implicit: unknown }>>();
    for (const dir of this.cellDefs()) {
      map.set(dir.appDataTableCell(), dir.templateRef);
    }
    return map;
  });

  readonly mobileColumns = computed(() => this.columns().filter((c) => !c.hiddenOnMobile));

  readonly hasPagination = computed(() => this.totalPages() > 1);

  getCellTemplate(key: string): TemplateRef<{ $implicit: unknown }> | undefined {
    return this.cellTemplateMap().get(key);
  }

  getCellValue(col: DataTableColumn<T>, row: T): string {
    if (!col.accessor) return '';
    if (typeof col.accessor === 'function') {
      const val = col.accessor(row);
      return val === null || val === undefined ? '' : String(val);
    }
    const val = (row as Record<string, unknown>)[col.accessor];
    return val === null || val === undefined ? '' : String(val);
  }

  thClasses(col: DataTableColumn<T>): string {
    const base = 'px-3 py-2.5 sm:px-4 ';
    const align = col.align === 'right' ? 'text-right ' : 'text-left ';
    const nowrap = col.nowrap ? 'whitespace-nowrap ' : '';
    return base + align + nowrap;
  }

  tdClasses(col: DataTableColumn<T>): string {
    const base = 'px-3 py-2.5 sm:px-4 ';
    const align = col.align === 'right' ? 'text-right ' : '';
    const nowrap = col.nowrap ? 'whitespace-nowrap ' : '';
    const cellClass = col.cellClass ? col.cellClass + ' ' : '';
    return base + align + nowrap + cellClass;
  }
}
