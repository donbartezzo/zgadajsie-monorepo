import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-confirm-event',
  imports: [IconComponent, LoadingSpinnerComponent, PageHeadingComponent],
  template: `
    <div class="flex min-h-[60vh] items-center justify-center px-4">
      @if (loading()) {
        <app-loading-spinner />
      } @else if (confirmed()) {
        <app-page-heading
          heading="Wydarzenie opublikowane"
          description="Wydarzenie zostało potwierdzone i jest teraz widoczne publicznie."
          size="lg"
          centered
          spacing="none"
        >
          <div
            slot="icon"
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50"
          >
            <app-icon name="check" size="lg" [class]="'text-success-600'"></app-icon>
          </div>
        </app-page-heading>
      } @else {
        <app-page-heading
          heading="Nieprawidłowy link"
          description="Link potwierdzenia jest nieprawidłowy, wygasł lub wydarzenie zostało już potwierdzone."
          size="lg"
          centered
          spacing="none"
        >
          <div
            slot="icon"
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-50"
          >
            <app-icon name="alert-triangle" size="lg" [class]="'text-danger-600'"></app-icon>
          </div>
        </app-page-heading>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEventComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventSeriesService = inject(EventSeriesService);

  readonly loading = signal(true);
  readonly confirmed = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      return;
    }
    this.eventSeriesService.confirmEventByToken(token).subscribe({
      next: () => {
        this.confirmed.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
