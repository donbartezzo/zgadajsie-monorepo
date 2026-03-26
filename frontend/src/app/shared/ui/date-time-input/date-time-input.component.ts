import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import { IconComponent } from '../icon/icon.component';

const noop = (): void => undefined;
const noopChange = (_value: string | null): void => undefined;

@Component({
  selector: 'app-date-time-input',
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimeInputComponent),
      multi: true,
    },
  ],
  templateUrl: './date-time-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimeInputComponent implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly isOpen = signal(false);
  readonly disabled = signal(false);
  readonly dateValue = signal('');
  readonly hourValue = signal('19');
  readonly minuteValue = signal('00');
  readonly displayValue = computed(() => {
    const date = this.dateValue();
    if (!date) {
      return '';
    }

    const localValue = `${date}T${this.hourValue()}:${this.minuteValue()}`;
    const dateTime = DateTime.fromFormat(localValue, "yyyy-MM-dd'T'HH:mm", {
      zone: APP_DEFAULT_TIMEZONE,
      locale: 'pl',
    });

    if (!dateTime.isValid) {
      return '';
    }

    return dateTime.toFormat('dd.MM.yyyy HH:mm');
  });
  readonly hours = Array.from({ length: 24 }, (_, index) => index.toString().padStart(2, '0'));
  readonly minutes = Array.from({ length: 60 }, (_, index) => index.toString().padStart(2, '0'));

  private onChange: (value: string | null) => void = noopChange;
  private onTouched: () => void = noop;

  writeValue(value: string | null): void {
    if (!value) {
      this.dateValue.set('');
      this.hourValue.set('19');
      this.minuteValue.set('00');
      return;
    }

    const dateTime = DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm", {
      zone: APP_DEFAULT_TIMEZONE,
    });

    if (!dateTime.isValid) {
      return;
    }

    this.dateValue.set(dateTime.toFormat('yyyy-MM-dd'));
    this.hourValue.set(dateTime.toFormat('HH'));
    this.minuteValue.set(dateTime.toFormat('mm'));
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.isOpen.set(false);
    }
  }

  open(): void {
    if (this.disabled()) {
      return;
    }

    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.isOpen.update((value) => !value);
    this.onTouched();
  }

  onDateChange(value: string): void {
    this.dateValue.set(value);
    this.emitValue();
  }

  onHourChange(value: string): void {
    this.hourValue.set(value);
    this.emitValue();
  }

  onMinuteChange(value: string): void {
    this.minuteValue.set(value);
    this.emitValue();
  }

  clear(): void {
    this.dateValue.set('');
    this.hourValue.set('19');
    this.minuteValue.set('00');
    this.onChange(null);
    this.close();
  }

  private emitValue(): void {
    const date = this.dateValue();
    if (!date) {
      this.onChange(null);
      return;
    }

    this.onChange(`${date}T${this.hourValue()}:${this.minuteValue()}`);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
