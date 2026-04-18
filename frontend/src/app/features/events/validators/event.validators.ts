import { AbstractControl, ValidationErrors } from '@angular/forms';
import { fromLocalInputValue, nowInZone } from '@zgadajsie/shared';

export class EventValidators {
  static startDateInFuture(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const startUtc = fromLocalInputValue(control.value);
    const nowUtc = nowInZone().toISO()!;

    return startUtc <= nowUtc ? { startDateInPast: true } : null;
  }

  static endDateAfterStart(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const form = control.parent;
    if (!form) return null;

    const startDateStr = form.get('startsAt')?.value;
    if (!startDateStr) return null;

    const startUtc = fromLocalInputValue(startDateStr);
    const endUtc = fromLocalInputValue(control.value);

    return endUtc <= startUtc ? { endDateBeforeStart: true } : null;
  }
}
