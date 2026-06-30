import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../../../../core/services/admin.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { User } from '../../../../shared/types';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

interface PaymentListItem {
  id: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
  event?: { id: string; title: string };
}

@Component({
  selector: 'app-admin-user-detail',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    ButtonComponent,
    CardComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (user(); as u) {
        <app-page-heading [heading]="u.displayName" [description]="u.email" centered spacing="lg">
          <app-user-avatar slot="icon" [user]="u" size="lg" class="mb-3 block"></app-user-avatar>
          <div slot="below" class="flex items-center justify-center gap-2 mt-1">
            <span
              [class]="
                'text-xs px-2 py-0.5 rounded-full inline-block ' +
                (u.role === 'ADMIN'
                  ? 'bg-danger-50 text-danger-500'
                  : 'bg-neutral-100 text-neutral-600')
              "
              >{{ u.role }}</span
            >
            @if (!u.isActive || !u.isEmailVerified) {
              <span
                class="text-xs px-2 py-0.5 rounded-full bg-warning-50 text-warning-600 inline-block"
              >
                Nieaktywne
              </span>
            }
          </div>
        </app-page-heading>

        <app-card>
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-neutral-900">Edycja</h3>
            <input
              [(ngModel)]="editName"
              placeholder="Nazwa"
              class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900"
            />
            <app-button
              appearance="soft"
              color="primary"
              [loading]="saving()"
              (clicked)="saveUser()"
              >Zapisz</app-button
            >
          </div>
        </app-card>

        @if (!u.isActive || !u.isEmailVerified) {
          <app-card>
            <div class="space-y-3 mt-4">
              <h3 class="text-sm font-semibold text-neutral-900">Aktywacja konta</h3>
              <p class="text-xs text-neutral-500">
                Konto nie jest aktywne lub email nie został zweryfikowany. Możesz aktywować konto
                ręcznie.
              </p>
              <app-button
                appearance="soft"
                color="success"
                [loading]="saving()"
                (clicked)="activateAccount()"
                >Aktywuj konto</app-button
              >
            </div>
          </app-card>
        }

        <app-card>
          <div class="space-y-3 mt-4">
            <h3 class="text-sm font-semibold text-neutral-900">Płatności</h3>
            @for (p of payments(); track p.id) {
              <div class="flex justify-between text-xs py-1 border-b border-neutral-100">
                <span
                  >{{ p.event?.title || 'Wydarzenie' }}
                  <span class="text-neutral-400">{{ p.createdAt | date: 'd MMM' }}</span></span
                >
                <span
                  [class]="
                    p.status === 'COMPLETED'
                      ? 'text-success-400'
                      : p.status === 'REFUNDED'
                        ? 'text-warning-300'
                        : 'text-neutral-500'
                  "
                  >{{ p.amount | number: '1.2-2' }} zł
                  <span class="text-[10px]">{{ p.status }}</span></span
                >
              </div>
            } @empty {
              <p class="text-xs text-neutral-400">Brak płatności</p>
            }
          </div>
        </app-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly snackbar = inject(SnackbarService);

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly payments = signal<PaymentListItem[]>([]);
  editName = '';

  private get userId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.adminService.getUser(this.userId).subscribe({
      next: (u) => {
        this.user.set(u);
        this.editName = u.displayName;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.adminService
      .getUserPayments(this.userId)
      .subscribe({ next: (r) => this.payments.set(r.data) });
  }

  saveUser(): void {
    this.saving.set(true);
    this.adminService.updateUser(this.userId, { displayName: this.editName }).subscribe({
      next: () => {
        this.snackbar.success('Zapisano');
        this.saving.set(false);
      },
      error: () => {
        this.snackbar.error('Błąd');
        this.saving.set(false);
      },
    });
  }

  activateAccount(): void {
    this.saving.set(true);
    this.adminService.updateUser(this.userId, { isEmailVerified: true }).subscribe({
      next: () => {
        this.snackbar.success('Konto aktywowane');
        this.user.update((u) => (u ? { ...u, isActive: true, isEmailVerified: true } : null));
        this.saving.set(false);
      },
      error: () => {
        this.snackbar.error('Błąd');
        this.saving.set(false);
      },
    });
  }
}
