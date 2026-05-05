import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RecurrencePickerComponent } from './recurrence-picker.component';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';

describe('RecurrencePickerComponent', () => {
  let fixture: ComponentFixture<RecurrencePickerComponent>;
  let component: RecurrencePickerComponent;
  let fb: FormBuilder;

  function makeSeriesForm() {
    return fb.group({
      recurrenceType: [EventSeriesRecurrenceType.INTERVAL],
      intervalDays: [7],
      daysOfWeek: [[] as number[]],
      time: ['19:00'],
      durationMinutes: [60],
      startDate: ['2026-05-10'],
      endDate: [''],
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurrencePickerComponent, ReactiveFormsModule],
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(RecurrencePickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('formGroup', makeSeriesForm());
    fixture.detectChanges();
  });

  it('renders in INTERVAL mode by default', () => {
    expect(component.selectedType()).toBe(EventSeriesRecurrenceType.INTERVAL);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input[type="number"][formControlName="intervalDays"]')).toBeTruthy();
  });

  it('switches to WEEKLY mode when setRecurrenceType is called', () => {
    component.setRecurrenceType(EventSeriesRecurrenceType.WEEKLY);
    fixture.detectChanges();

    expect(component.selectedType()).toBe(EventSeriesRecurrenceType.WEEKLY);
    const el = fixture.nativeElement as HTMLElement;
    const dayButtons = el.querySelectorAll('button[aria-pressed]');
    expect(dayButtons.length).toBe(7);
  });

  it('toggleDay adds and removes days from daysOfWeek', () => {
    component.setRecurrenceType(EventSeriesRecurrenceType.WEEKLY);
    fixture.detectChanges();

    component.toggleDay(1);
    expect(component.isDaySelected(1)).toBe(true);

    component.toggleDay(4);
    expect(component.isDaySelected(4)).toBe(true);
    expect(component.isDaySelected(1)).toBe(true);

    component.toggleDay(1);
    expect(component.isDaySelected(1)).toBe(false);
    expect(component.isDaySelected(4)).toBe(true);
  });

  it('daysOfWeek are sorted after toggle', () => {
    component.setRecurrenceType(EventSeriesRecurrenceType.WEEKLY);
    component.toggleDay(5);
    component.toggleDay(1);
    component.toggleDay(3);

    const days: number[] = component.formGroup().get('daysOfWeek')?.value;
    expect(days).toEqual([1, 3, 5]);
  });

  it('shows preview dates when form is complete with INTERVAL', () => {
    const form = component.formGroup();
    form.patchValue({
      recurrenceType: EventSeriesRecurrenceType.INTERVAL,
      intervalDays: 7,
      time: '20:00',
      durationMinutes: 60,
      startDate: '2026-05-01',
    });
    form.updateValueAndValidity();
    (component as unknown as { refreshPreview: () => void }).refreshPreview?.();
    fixture.detectChanges();

    expect(component.previewDates().length).toBeGreaterThan(0);
  });

  it('shows preview dates when form is complete with WEEKLY', () => {
    const form = component.formGroup();
    form.patchValue({
      recurrenceType: EventSeriesRecurrenceType.WEEKLY,
      time: '20:00',
      durationMinutes: 60,
      startDate: '2026-05-01',
    });
    form.get('daysOfWeek')?.setValue([1, 3]);
    form.updateValueAndValidity();
    (component as unknown as { refreshPreview: () => void }).refreshPreview?.();
    fixture.detectChanges();

    expect(component.previewDates().length).toBeGreaterThan(0);
  });

  it('clears preview dates when required fields are missing', () => {
    const form = component.formGroup();
    form.patchValue({ time: '', startDate: '' });
    form.updateValueAndValidity();
    (component as unknown as { refreshPreview: () => void }).refreshPreview?.();
    fixture.detectChanges();

    expect(component.previewDates().length).toBe(0);
  });

  it('formatPreviewDate returns localized date string', () => {
    const iso = '2026-05-11T18:00:00.000Z';
    const result = component.formatPreviewDate(iso);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(5);
  });

  it('all 7 day options are rendered in WEEKLY mode', () => {
    component.setRecurrenceType(EventSeriesRecurrenceType.WEEKLY);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button[aria-pressed]');
    expect(buttons.length).toBe(7);

    const labels = Array.from(buttons).map((b) => b.getAttribute('aria-label'));
    expect(labels).toContain('Poniedziałek');
    expect(labels).toContain('Niedziela');
  });
});
