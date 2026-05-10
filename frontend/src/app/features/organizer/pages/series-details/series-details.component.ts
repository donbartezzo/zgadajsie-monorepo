import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { RecurrencePickerComponent } from '../../../../shared/event-form/ui/recurrence-picker/recurrence-picker.component';
import { FormControlErrorDirective } from '../../../../shared/ui/form-control-error/form-control-error.directive';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { EventSeriesView } from '../../../../shared/types';
import {
  EventSeriesRecurrenceType,
  formatDateLong,
  formatTime,
  UpdateEventSeriesPayload,
} from '@zgadajsie/shared';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Pn',
  2: 'Wt',
  3: 'Śr',
  4: 'Czw',
  5: 'Pt',
  6: 'Sb',
  7: 'Nd',
};

@Component({
  selector: 'app-series-details',
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    IconComponent,
    LoadingSpinnerComponent,
    RecurrencePickerComponent,
    ReactiveFormsModule,
    FormControlErrorDirective,
  ],
  templateUrl: './series-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly navigation = inject(NavigationService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly snackbar = inject(SnackbarService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly series = signal<EventSeriesView | null>(null);
  readonly isEditing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly editForm = signal<FormGroup | null>(null);

  readonly affectedEventsCount = computed(() => {
    const s = this.series();
    if (!s) {
      return { withoutEnrollments: 0, withEnrollments: 0 };
    }
    const now = new Date();
    const future = s.events.filter((e) => new Date(e.startsAt) > now);
    const withoutEnrollments = future.filter((e) => (e._count?.enrollments ?? 0) === 0).length;
    const withEnrollments = future.filter((e) => (e._count?.enrollments ?? 0) > 0).length;
    return { withoutEnrollments, withEnrollments };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Brak identyfikatora serii.');
      this.loading.set(false);
      return;
    }

    this.eventSeriesService.getSeries(id).subscribe({
      next: (series) => {
        this.series.set(series);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Nie udało się wczytać serii.');
        this.loading.set(false);
      },
    });
  }

  startEdit(): void {
    const s = this.series();
    if (!s) return;
    this.editForm.set(
      this.fb.group({
        name: [s.name, [Validators.required, Validators.maxLength(120)]],
        recurrenceType: [s.recurrenceType, Validators.required],
        intervalDays: [s.intervalDays ?? 7],
        daysOfWeek: [s.daysOfWeek ?? []],
        time: [s.time, Validators.required],
        durationMinutes: [s.durationMinutes, [Validators.required, Validators.min(15)]],
        startDate: [s.startDate.slice(0, 10), Validators.required],
        endDate: [s.endDate ? s.endDate.slice(0, 10) : ''],
        isActive: [s.isActive],
      }),
    );
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editForm.set(null);
    this.saveError.set(null);
  }

  async saveEdit(): Promise<void> {
    const form = this.editForm();
    if (!form || form.invalid) return;

    const s = this.series();
    if (!s) return;

    const counts = this.affectedEventsCount();
    const withoutMsg =
      counts.withoutEnrollments > 0
        ? `${counts.withoutEnrollments} wydarzeń bez zapisów zostanie usuniętych i wygenerowanych ponownie.`
        : 'Brak przyszłych wydarzeń bez zapisów — zostaną wygenerowane nowe.';
    const withMsg =
      counts.withEnrollments > 0
        ? ` ${counts.withEnrollments} wydarzeń z zapisami pozostanie bez zmian.`
        : '';

    const confirmed = await this.confirmModal.confirm({
      title: 'Potwierdź edycję serii',
      message: withoutMsg + withMsg,
      confirmLabel: 'Zapisz zmiany',
      cancelLabel: 'Anuluj',
      color: 'warning',
    });

    if (!confirmed) return;

    this.saving.set(true);
    this.saveError.set(null);

    const value = form.getRawValue() as {
      name: string;
      recurrenceType: EventSeriesRecurrenceType;
      intervalDays: number | null;
      daysOfWeek: number[];
      time: string;
      durationMinutes: number;
      startDate: string;
      endDate: string;
      isActive: boolean;
    };

    const payload: UpdateEventSeriesPayload = {
      name: value.name,
      recurrenceType: value.recurrenceType,
      intervalDays: value.intervalDays ?? undefined,
      daysOfWeek: value.daysOfWeek,
      time: value.time,
      durationMinutes: value.durationMinutes,
      startDate: value.startDate,
      endDate: value.endDate || undefined,
      isActive: value.isActive,
    };

    this.eventSeriesService.updateSeries(s.id, payload).subscribe({
      next: (updated) => {
        this.series.set(updated);
        this.isEditing.set(false);
        this.editForm.set(null);
        this.saving.set(false);
        this.snackbar.success('Seria została zaktualizowana.');
      },
      error: (err) => {
        this.saveError.set(err?.error?.message || 'Nie udało się zapisać zmian.');
        this.saving.set(false);
      },
    });
  }

  async deactivateSeries(): Promise<void> {
    const s = this.series();
    if (!s) return;

    const confirmed = await this.confirmModal.confirm({
      title: 'Dezaktywuj serię',
      message:
        'Seria zostanie dezaktywowana. Przyszłe wydarzenia bez zapisów zostaną usunięte. Wydarzeń z zapisami nie ruszamy.',
      confirmLabel: 'Dezaktywuj',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });

    if (!confirmed) return;

    this.eventSeriesService.deactivate(s.id).subscribe({
      next: (result) => {
        this.series.update((prev) => (prev ? { ...prev, isActive: false } : null));
        const msg =
          result.deletedFutureEvents > 0
            ? `Seria dezaktywowana. Usunięto ${result.deletedFutureEvents} przyszłych wydarzeń.`
            : 'Seria dezaktywowana.';
        this.snackbar.info(msg);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się dezaktywować serii.');
      },
    });
  }

  recurrenceDescription(series: EventSeriesView): string {
    if (series.recurrenceType === EventSeriesRecurrenceType.INTERVAL) {
      return `co ${series.intervalDays ?? 7} dni`;
    }

    const days = series.daysOfWeek ?? [];
    if (days.length === 0) {
      return 'co tydzień';
    }

    return `w dni: ${days.map((day) => WEEKDAY_LABELS[day] ?? String(day)).join(', ')}`;
  }

  formatDateValue(value: string): string {
    return formatDateLong(value);
  }

  formatTimeValue(value: string): string {
    return formatTime(value);
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (hours === 0) {
      return `${minutes} min`;
    }
    if (remaining === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${remaining} min`;
  }

  openEventManage(eventId: string): void {
    void this.navigation.navigateToEventManage(eventId);
  }

  backToMyEvents(): void {
    void this.navigation.navigateToProfileEvents();
  }
}
