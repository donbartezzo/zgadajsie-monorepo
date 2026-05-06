import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { EventSeriesView } from '../../../../shared/types';
import { EventSeriesRecurrenceType, formatDateLong, formatTime } from '@zgadajsie/shared';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Pn',
  2: 'Wt',
  3: 'Śr',
  4: 'Cz',
  5: 'Pt',
  6: 'Sb',
  7: 'Nd',
};

@Component({
  selector: 'app-series-details',
  imports: [ButtonComponent, CardComponent, EmptyStateComponent, LoadingSpinnerComponent],
  template: `
    <div class="p-4 space-y-4">
      @if (loading()) {
        <div class="py-12 flex justify-center">
          <app-loading-spinner />
        </div>
      } @else if (error()) {
        <app-card>
          <div class="p-6">
            <app-empty-state
              icon="alert-triangle"
              title="Nie udało się wczytać serii"
              [message]="error()!"
            />
            <div class="mt-6 flex justify-center">
              <app-button appearance="soft" color="primary" (clicked)="backToMyEvents()">
                Wróć do moich wydarzeń
              </app-button>
            </div>
          </div>
        </app-card>
      } @else if (series(); as series) {
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs font-medium uppercase tracking-wide text-primary-500">
              Seria wydarzeń
            </p>
            <h1 class="text-xl font-bold text-neutral-900">{{ series.name }}</h1>
            <p class="text-sm text-neutral-600">{{ recurrenceDescription(series) }}</p>
          </div>

          @if (series.isActive) {
            <span
              class="inline-flex shrink-0 items-center rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600"
            >
              Aktywna
            </span>
          } @else {
            <span
              class="inline-flex shrink-0 items-center rounded-full bg-warning-50 px-3 py-1 text-xs font-medium text-warning-600"
            >
              Nieaktywna
            </span>
          }
        </div>

        <app-card>
          <div class="p-4 space-y-4">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Start serii
                </p>
                <p class="mt-1 text-sm font-semibold text-neutral-900">
                  {{ formatDateValue(series.startDate) }}
                </p>
                <p class="text-xs text-neutral-500">{{ series.time }} • {{ series.timezone }}</p>
              </div>

              <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Czas trwania
                </p>
                <p class="mt-1 text-sm font-semibold text-neutral-900">
                  {{ formatDuration(series.durationMinutes) }}
                </p>
                <p class="text-xs text-neutral-500">Bufor: {{ series.bufferDays }} dni</p>
              </div>

              <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Automatyczny cover
                </p>
                <p class="mt-1 text-sm font-semibold text-neutral-900">
                  {{ series.autoCoverImage ? 'Tak' : 'Nie' }}
                </p>
                <p class="text-xs text-neutral-500">
                  {{ series.isActive ? 'Generowanie aktywne' : 'Generowanie wyłączone' }}
                </p>
              </div>
            </div>

            @if (series.endDate) {
              <div
                class="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600"
              >
                Seria kończy się {{ formatDateValue(series.endDate) }}.
              </div>
            } @else {
              <div
                class="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700"
              >
                Seria jest bezterminowa i będzie generować kolejne wydarzenia do odwołania.
              </div>
            }
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-neutral-900">Nadchodzące wydarzenia</h2>
                <p class="text-xs text-neutral-500">
                  Lista wygenerowanych instancji należących do tej serii.
                </p>
              </div>
              <span class="text-xs text-neutral-500">{{ series.events.length }} pozycji</span>
            </div>

            @if (series.events.length === 0) {
              <app-empty-state
                icon="calendar"
                title="Brak nadchodzących wydarzeń"
                message="Seria jeszcze nie ma wygenerowanych terminów w aktualnym buforze."
              />
            } @else {
              <div class="space-y-3">
                @for (event of series.events; track event.id) {
                  <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p class="text-sm font-medium text-neutral-900">{{ event.title }}</p>
                        <p class="text-xs text-neutral-500">
                          {{ formatDateValue(event.startsAt) }} •
                          {{ formatTimeValue(event.startsAt) }} –
                          {{ formatTimeValue(event.endsAt) }}
                        </p>
                      </div>

                      <app-button
                        appearance="soft"
                        color="primary"
                        size="sm"
                        iconLeft="settings"
                        (clicked)="openEventManage(event.id)"
                      >
                        Zarządzaj wydarzeniem
                      </app-button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </app-card>

        <div class="flex justify-end">
          <app-button appearance="soft" color="primary" (clicked)="backToMyEvents()">
            Wróć do moich wydarzeń
          </app-button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly series = signal<EventSeriesView | null>(null);

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
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
      return `${minutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} h`;
    }

    return `${hours} h ${remainingMinutes} min`;
  }

  openEventManage(eventId: string): void {
    void this.router.navigate(['/o', 'w', eventId, 'manage']);
  }

  backToMyEvents(): void {
    void this.router.navigate(['/profile/events']);
  }
}
