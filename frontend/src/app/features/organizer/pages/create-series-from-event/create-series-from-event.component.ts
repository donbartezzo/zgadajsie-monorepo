import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../../core/services/event.service';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { RecurrencePickerComponent } from '../../../../shared/event-form/ui/recurrence-picker/recurrence-picker.component';
import { EventSeriesRecurrenceType, CreateSeriesFromEventPayload } from '@zgadajsie/shared';
import { Event } from '../../../../shared/types';

@Component({
  selector: 'app-create-series-from-event',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    RecurrencePickerComponent,
  ],
  templateUrl: './create-series-from-event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSeriesFromEventComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly snackbar = inject(SnackbarService);
  private readonly navigation = inject(NavigationService);

  readonly eventId = signal<string | null>(null);
  readonly eventData = signal<Event | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly fakeUsersEnabled = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    recurrenceType: [
      EventSeriesRecurrenceType.INTERVAL as EventSeriesRecurrenceType,
      Validators.required,
    ],
    intervalDays: [7],
    daysOfWeek: [[] as number[]],
    time: ['19:00', Validators.required],
    timezone: ['Europe/Warsaw'],
    durationMinutes: [120, [Validators.required, Validators.min(15)]],
    startDate: ['', Validators.required],
    endDate: [''],
    bufferDays: [30],
    autoCoverImage: [false],
  });

  readonly fakeUsersForm = this.fb.group({
    targetOccupancy: [35, [Validators.min(0), Validators.max(100)]],
    cleanupHours: [12, [Validators.min(0)]],
    minFreeSlotsBuffer: [3, [Validators.min(0)]],
  });

  readonly canSubmit = computed(() => this.form.valid && !this.submitting());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.snackbar.error('Brak identyfikatora wydarzenia');
      void this.router.navigate(['/']);
      return;
    }
    this.eventId.set(id);
    this.loadEvent(id);
  }

  private loadEvent(id: string): void {
    this.loading.set(true);
    this.eventService.getEvent(id).subscribe({
      next: (event) => {
        this.eventData.set(event);
        this.loading.set(false);

        if (event.seriesId) {
          this.snackbar.info('To wydarzenie już należy do serii');
          void this.navigation.navigateToSeries(event.seriesId);
          return;
        }

        if (!event.currentUserAccess?.canCreateSeries) {
          const reason = !event.currentUserAccess?.isOrganizer
            ? 'Tylko organizator wydarzenia może utworzyć z niego serię.'
            : event.status !== 'ACTIVE'
              ? 'Nie można utworzyć serii z wydarzenia, które nie jest aktywne.'
              : 'Nie możesz utworzyć serii z tego wydarzenia.';
          this.snackbar.error(reason);
          void this.navigation.navigateToEventDetail(event.id, event.citySlug);
          return;
        }

        // Pre-fill startDate and time from event
        const startsAt = new Date(event.startsAt);
        const year = startsAt.getFullYear();
        const month = String(startsAt.getMonth() + 1).padStart(2, '0');
        const day = String(startsAt.getDate()).padStart(2, '0');
        const hours = String(startsAt.getHours()).padStart(2, '0');
        const minutes = String(startsAt.getMinutes()).padStart(2, '0');

        const durationMinutes = Math.round(
          (new Date(event.endsAt).getTime() - startsAt.getTime()) / 60000,
        );

        this.form.patchValue({
          startDate: `${year}-${month}-${day}`,
          time: `${hours}:${minutes}`,
          durationMinutes,
        });
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.error('Nie udało się pobrać danych wydarzenia');
        void this.router.navigate(['/']);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    const eventId = this.eventId();
    if (!eventId) return;

    const val = this.form.getRawValue() as {
      name: string;
      recurrenceType: EventSeriesRecurrenceType;
      intervalDays: number | null;
      daysOfWeek: number[] | null;
      time: string | null;
      timezone: string | null;
      durationMinutes: number | null;
      startDate: string | null;
      endDate: string | null;
      bufferDays: number | null;
      autoCoverImage: boolean | null;
    };
    const payload: CreateSeriesFromEventPayload = {
      name: val.name || '',
      recurrenceType: val.recurrenceType || EventSeriesRecurrenceType.INTERVAL,
      intervalDays: val.intervalDays ?? undefined,
      daysOfWeek: val.daysOfWeek ?? undefined,
      time: val.time ?? undefined,
      timezone: val.timezone ?? undefined,
      durationMinutes: val.durationMinutes ?? undefined,
      startDate: val.startDate ?? undefined,
      endDate: val.endDate || undefined,
      bufferDays: val.bufferDays ?? undefined,
      autoCoverImage: val.autoCoverImage ?? undefined,
    };

    if (this.fakeUsersEnabled()) {
      const fu = this.fakeUsersForm.getRawValue() as {
        targetOccupancy: number | null;
        cleanupHours: number | null;
        minFreeSlotsBuffer: number | null;
      };
      if (fu.targetOccupancy !== null) payload.targetOccupancy = fu.targetOccupancy;
      if (fu.cleanupHours !== null) payload.cleanupHours = fu.cleanupHours;
      if (fu.minFreeSlotsBuffer !== null) payload.minFreeSlotsBuffer = fu.minFreeSlotsBuffer;
    }

    this.submitting.set(true);
    this.eventSeriesService.createFromEvent(eventId, payload).subscribe({
      next: (series) => {
        this.snackbar.success('Seria wydarzeń utworzona');
        void this.navigation.navigateToSeries(series.id);
        this.submitting.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się utworzyć serii');
        this.submitting.set(false);
      },
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if ((control as unknown as FormGroup)?.controls) {
        this.markFormGroupTouched(control as unknown as FormGroup);
      }
    });
  }
}
