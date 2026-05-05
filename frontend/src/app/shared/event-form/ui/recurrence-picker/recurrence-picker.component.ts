import { ChangeDetectionStrategy, Component, input, OnChanges, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { DateTime } from 'luxon';
import {
  EventSeriesRecurrenceType,
  previewSeriesDates,
  EventSeriesPreviewItem,
  EVENT_SERIES_PREVIEW_COUNT,
} from '@zgadajsie/shared';

interface DayOption {
  value: number;
  label: string;
  short: string;
}

const DAY_OPTIONS: DayOption[] = [
  { value: 1, label: 'Poniedziałek', short: 'Pn' },
  { value: 2, label: 'Wtorek', short: 'Wt' },
  { value: 3, label: 'Środa', short: 'Śr' },
  { value: 4, label: 'Czwartek', short: 'Czw' },
  { value: 5, label: 'Piątek', short: 'Pt' },
  { value: 6, label: 'Sobota', short: 'Sb' },
  { value: 7, label: 'Niedziela', short: 'Nd' },
];

@Component({
  selector: 'app-recurrence-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './recurrence-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurrencePickerComponent implements OnChanges {
  readonly formGroup = input.required<FormGroup>();
  readonly timezone = input<string>('Europe/Warsaw');
  readonly previewCount = input<number>(EVENT_SERIES_PREVIEW_COUNT);

  readonly RecurrenceType = EventSeriesRecurrenceType;
  readonly dayOptions = DAY_OPTIONS;

  readonly previewDates = signal<EventSeriesPreviewItem[]>([]);
  readonly selectedType = signal<EventSeriesRecurrenceType>(EventSeriesRecurrenceType.INTERVAL);

  ngOnChanges(): void {
    const fg = this.formGroup();
    this.selectedType.set(fg.get('recurrenceType')?.value ?? EventSeriesRecurrenceType.INTERVAL);
    fg.valueChanges.subscribe(() => {
      this.selectedType.set(fg.get('recurrenceType')?.value ?? EventSeriesRecurrenceType.INTERVAL);
      this.refreshPreview();
    });
    this.refreshPreview();
  }

  isDaySelected(day: number): boolean {
    const days: number[] = this.formGroup().get('daysOfWeek')?.value ?? [];
    return days.includes(day);
  }

  toggleDay(day: number): void {
    const ctrl = this.formGroup().get('daysOfWeek');
    if (!ctrl) return;
    const current: number[] = ctrl.value ?? [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    ctrl.setValue(updated);
    ctrl.markAsDirty();
  }

  setRecurrenceType(type: EventSeriesRecurrenceType): void {
    this.formGroup().get('recurrenceType')?.setValue(type);
    this.formGroup().get('recurrenceType')?.markAsDirty();
  }

  formatPreviewDate(isoDate: string): string {
    return DateTime.fromISO(isoDate, { zone: this.timezone() })
      .setLocale('pl')
      .toFormat('EEE d MMM, HH:mm');
  }

  private refreshPreview(): void {
    const fg = this.formGroup();
    const type = fg.get('recurrenceType')?.value as EventSeriesRecurrenceType;
    const time = fg.get('time')?.value as string;
    const startDate = fg.get('startDate')?.value as string;
    const durationMinutes = fg.get('durationMinutes')?.value as number;

    if (!type || !time || !startDate || !durationMinutes) {
      this.previewDates.set([]);
      return;
    }

    try {
      const config =
        type === EventSeriesRecurrenceType.INTERVAL
          ? {
              type: EventSeriesRecurrenceType.INTERVAL as const,
              intervalDays: (fg.get('intervalDays')?.value as number) || 7,
            }
          : {
              type: EventSeriesRecurrenceType.WEEKLY as const,
              daysOfWeek: (fg.get('daysOfWeek')?.value as number[]) || [],
            };

      const dates = previewSeriesDates(
        config,
        {
          time,
          timezone: this.timezone(),
          startDate: new Date(startDate),
          durationMinutes,
        },
        this.previewCount(),
      );
      this.previewDates.set(dates);
    } catch {
      this.previewDates.set([]);
    }
  }
}
