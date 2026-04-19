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
  ],
  template: `
    <div class="p-4">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (user(); as u) {
        <div class="text-center mb-6">
          <app-user-avatar
            [avatarUrl]="u.avatarUrl"
            [displayName]="u.displayName"
            size="lg"
          ></app-user-avatar>
          <h1 class="mt-3 text-xl font-bold text-neutral-900">{{ u.displayName }}</h1>
          <p class="text-sm text-neutral-500">{{ u.email }}</p>
          <span
            [class]="
              'text-xs px-2 py-0.5 rounded-full mt-1 inline-block ' +
              (u.role === 'ADMIN'
                ? 'bg-danger-50 text-danger-500'
                : 'bg-neutral-100 text-neutral-600')
            "
            >{{ u.role }}</span
          >
        </div>

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
    return this.route.snapshot.paramMap.get('id')!;
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
}
