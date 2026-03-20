import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { EventAnnouncementService } from '../../../../core/services/event-announcement.service';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-confirm-announcement',
  imports: [IconComponent, LoadingSpinnerComponent],
  template: `
    <div class="flex min-h-[60vh] items-center justify-center px-4">
      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else if (confirmed()) {
      <div class="text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50"
        >
          <app-icon name="check" size="lg" [class]="'text-success-600'"></app-icon>
        </div>
        <h1 class="text-lg font-bold text-neutral-900">Potwierdzono odbiór</h1>
        <p class="mt-2 text-sm text-neutral-500">
          Dziękujemy za potwierdzenie odebrania komunikatu organizatora.
        </p>
      </div>
      } @else {
      <div class="text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-50"
        >
          <app-icon name="alert-triangle" size="lg" [class]="'text-danger-600'"></app-icon>
        </div>
        <h1 class="text-lg font-bold text-neutral-900">Nieprawidłowy link</h1>
        <p class="mt-2 text-sm text-neutral-500">
          Link potwierdzenia jest nieprawidłowy lub wygasł.
        </p>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmAnnouncementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly announcementService = inject(EventAnnouncementService);

  readonly loading = signal(true);
  readonly confirmed = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading.set(false);
      return;
    }
    this.announcementService.confirmByToken(token).subscribe({
      next: () => {
        this.confirmed.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
