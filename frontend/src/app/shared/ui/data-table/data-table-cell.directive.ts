import { Directive, TemplateRef, inject, input } from '@angular/core';

@Directive({
  selector: 'ng-template[appDataTableCell]',
  standalone: true,
})
export class DataTableCellDirective {
  readonly appDataTableCell = input.required<string>();
  readonly templateRef = inject(TemplateRef<{ $implicit: unknown }>);
}
