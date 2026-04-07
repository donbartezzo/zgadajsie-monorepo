import { Directive, HostBinding, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appFormControlError]',
  standalone: true,
})
export class FormControlErrorDirective {
  private readonly ngControl = inject(NgControl, { optional: true });

  @HostBinding('class') get classes(): string {
    if (!this.ngControl?.control) {
      return 'w-full border-neutral-300';
    }

    const control = this.ngControl.control;
    const baseClasses =
      'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500';

    if (control.touched && control.invalid) {
      return `${baseClasses} border-danger-500`;
    }

    return `${baseClasses} border-neutral-300`;
  }
}
