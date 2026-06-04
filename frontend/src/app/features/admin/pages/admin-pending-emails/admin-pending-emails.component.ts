import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AdminService, PendingEmailNotification } from '../../../../core/services/admin.service';
import { NotificationKind } from '@zgadajsie/shared';

@Component({
  selector: 'app-admin-pending-emails',
  imports: [CommonModule, CardComponent, ButtonComponent, DatePipe],
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold text-neutral-900 mb-6">Kolejka emaili do wysyłki</h1>
      <div class="mb-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <select
            [value]="selectedType()"
            (change)="onTypeChange($event)"
            class="px-3 py-1.5 text-sm border border-neutral-200 rounded-md bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Wszystkie typy</option>
            @for (type of notificationTypes; track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
          <p class="text-sm text-neutral-500">Łącznie: {{ total() }} notyfikacji</p>
        </div>
        <app-button (clicked)="loadPendingEmails()" variant="outline" size="sm">
          Odśwież
        </app-button>
      </div>
      @if (loading()) {
        <div class="text-center text-neutral-500 py-8">Ładowanie...</div>
      } @else if (pendingEmails().length === 0) {
        <div class="text-center text-neutral-500 py-8">Brak notyfikacji oczekujących na email</div>
      } @else {
        <div class="space-y-3">
          @for (notification of pendingEmails(); track notification.id) {
            <app-card>
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="px-2 py-0.5 text-xs font-medium text-secondary bg-secondary/10 rounded-full"
                    >
                      {{ notification.type }}
                    </span>
                  </div>
                  <h3 class="font-medium text-neutral-900 mb-1 truncate">
                    {{ notification.title }}
                  </h3>
                  <p class="text-sm text-neutral-600 mb-2 line-clamp-2">
                    {{ notification.body }}
                  </p>
                  <div class="text-xs text-neutral-500 space-y-1">
                    <p>
                      <span class="font-medium">Użytkownik:</span>
                      {{ notification.user.displayName }} ({{ notification.user.email }})
                    </p>
                    <p>
                      <span class="font-medium">Utworzono:</span>
                      {{ notification.createdAt | date: 'short' }}
                    </p>
                    @if (notification.link) {
                      <p>
                        <span class="font-medium">Link:</span>
                        <a
                          [href]="notification.link"
                          target="_blank"
                          rel="noopener"
                          class="text-secondary hover:underline"
                        >
                          {{ notification.link }}
                        </a>
                      </p>
                    }
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <app-button
                    (clicked)="cancelEmail(notification.id)"
                    [disabled]="cancelling() === notification.id"
                    [loading]="cancelling() === notification.id"
                    variant="danger"
                    size="sm"
                  >
                    Anuluj email
                  </app-button>
                </div>
              </div>
            </app-card>
          }
        </div>
        @if (total() > limit()) {
          <div class="mt-4 flex justify-center">
            <app-button (clicked)="loadMore()" [disabled]="loading()" variant="outline" size="sm">
              Załaduj więcej
            </app-button>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPendingEmailsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly pendingEmails = signal<PendingEmailNotification[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(50);
  readonly loading = signal(false);
  readonly cancelling = signal<string | null>(null);
  readonly selectedType = signal<string>('');
  readonly notificationTypes = Object.values(NotificationKind);

  ngOnInit(): void {
    this.loadPendingEmails();
  }

  onTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedType.set(target.value);
    this.page.set(1);
    this.loadPendingEmails();
  }

  loadPendingEmails(): void {
    this.loading.set(true);
    this.adminService
      .getPendingEmails(this.page(), this.limit(), this.selectedType() || undefined)
      .subscribe({
        next: (response) => {
          this.pendingEmails.set(response.data);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  loadMore(): void {
    this.page.update((p) => p + 1);
    this.loading.set(true);
    this.adminService
      .getPendingEmails(this.page(), this.limit(), this.selectedType() || undefined)
      .subscribe({
        next: (response) => {
          this.pendingEmails.update((current) => [...current, ...response.data]);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  cancelEmail(notificationId: string): void {
    this.cancelling.set(notificationId);
    this.adminService.cancelEmailForNotification(notificationId).subscribe({
      next: (result) => {
        this.cancelling.set(null);
        if (result) {
          this.pendingEmails.update((current) => current.filter((n) => n.id !== notificationId));
          this.total.update((t) => t - 1);
        }
      },
      error: () => {
        this.cancelling.set(null);
      },
    });
  }
}
