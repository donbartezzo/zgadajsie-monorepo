import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AccountContentComponent } from '../../../../shared/ui/account-nav-rail/account-content.component';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { formatDateLong } from '@zgadajsie/shared';
import { EventSeriesView } from '../../../../shared/types';

@Component({
  selector: 'app-organizer-series',
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    IconComponent,
    AccountContentComponent,
  ],
  templateUrl: './organizer-series.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerSeriesComponent implements OnInit {
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly navigation = inject(NavigationService);

  readonly series = signal<EventSeriesView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly stats = computed(() => {
    const list = this.series();
    return {
      total: list.length,
      active: list.filter((s) => s.isActive && !s.suspendedReason).length,
      suspended: list.filter((s) => s.suspendedReason).length,
      deactivated: list.filter((s) => !s.isActive).length,
    };
  });

  ngOnInit(): void {
    this.loadSeries();
  }

  private loadSeries(): void {
    this.loading.set(true);
    this.error.set(null);
    this.eventSeriesService.getMine().subscribe({
      next: (data) => {
        this.series.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Nie udało się załadować serii.');
        this.loading.set(false);
      },
    });
  }

  navigateToSeries(seriesId: string): void {
    void this.navigation.navigateToSeries(seriesId);
  }

  formatDate(value: string): string {
    return formatDateLong(value);
  }
}
