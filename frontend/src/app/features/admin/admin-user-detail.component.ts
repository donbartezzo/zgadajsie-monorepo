import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../../core/services/admin.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { User, WalletTransaction } from '../../shared/types';

@Component({
  selector: 'app-admin-user-detail',
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, ButtonComponent, CardComponent, UserAvatarComponent, LoadingSpinnerComponent],
  template: `
    <div class="py-6">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (user(); as u) {
        <div class="text-center mb-6">
          <app-user-avatar [avatarUrl]="u.avatarUrl" [displayName]="u.displayName" size="lg"></app-user-avatar>
          <h1 class="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">{{ u.displayName }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ u.email }}</p>
          <span class="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" [class]="u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'">{{ u.role }}</span>
        </div>

        <app-card>
          <div class="p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Edycja</h3>
            <input [(ngModel)]="editName" placeholder="Nazwa" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm text-gray-900 dark:text-gray-100" />
            <app-button variant="primary" [loading]="saving()" (clicked)="saveUser()">Zapisz</app-button>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-3 mt-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Portfel: {{ walletBalance() | number:'1.2-2' }} zł</h3>
            <div class="flex gap-2">
              <input type="number" [(ngModel)]="adjustAmount" placeholder="Kwota" class="w-24 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
              <input [(ngModel)]="adjustDesc" placeholder="Opis" class="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
              <app-button variant="primary" (clicked)="onAdjust()">Adjust</app-button>
            </div>
            @for (t of transactions(); track t.id) {
              <div class="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-slate-700">
                <span>{{ t.description || t.type }} <span class="text-gray-400">{{ t.createdAt | date:'d MMM' }}</span></span>
                <span [class]="t.amount >= 0 ? 'text-green-600' : 'text-red-600'">{{ t.amount >= 0 ? '+' : '' }}{{ t.amount | number:'1.2-2' }} zł</span>
              </div>
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
  readonly walletBalance = signal(0);
  readonly transactions = signal<WalletTransaction[]>([]);
  editName = '';
  adjustAmount = 0;
  adjustDesc = '';

  private get userId(): string { return this.route.snapshot.paramMap.get('id')!; }

  ngOnInit(): void {
    this.adminService.getUser(this.userId).subscribe({
      next: (u) => { this.user.set(u); this.editName = u.displayName; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.adminService.getUserWallet(this.userId).subscribe({ next: (w) => this.walletBalance.set(w.balance) });
    this.adminService.getUserTransactions(this.userId).subscribe({ next: (r) => this.transactions.set(r.data) });
  }

  saveUser(): void {
    this.saving.set(true);
    this.adminService.updateUser(this.userId, { displayName: this.editName }).subscribe({
      next: () => { this.snackbar.success('Zapisano'); this.saving.set(false); },
      error: () => { this.snackbar.error('Błąd'); this.saving.set(false); },
    });
  }

  onAdjust(): void {
    this.adminService.adjustWallet(this.userId, this.adjustAmount, this.adjustDesc).subscribe({
      next: () => {
        this.walletBalance.update(b => b + this.adjustAmount);
        this.snackbar.success('Portfel zaktualizowany');
        this.adjustAmount = 0; this.adjustDesc = '';
      },
      error: () => this.snackbar.error('Błąd'),
    });
  }
}
