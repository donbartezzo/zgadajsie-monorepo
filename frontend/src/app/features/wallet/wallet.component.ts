import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import { WalletService } from '../../core/services/wallet.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { WalletTransaction } from '../../shared/types';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, RouterLink, IconComponent, ButtonComponent, CardComponent, LoadingSpinnerComponent, PaginationComponent],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Portfel</h1>

      <app-card>
        <div class="p-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{{ balance() | number:'1.2-2' }} zł</p>
          <div class="mt-4">
            @if (!showTopup()) {
              <app-button variant="primary" (clicked)="showTopup.set(true)">
                <app-icon name="credit-card" size="sm"></app-icon> Doładuj
              </app-button>
            } @else {
              <div class="flex gap-2 items-center justify-center">
                <input type="number" [(ngModel)]="topupAmount" min="1" step="1" placeholder="Kwota (zł)"
                  class="w-32 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
                <app-button variant="primary" [loading]="topupLoading()" (clicked)="onTopup()">Zapłać</app-button>
                <app-button variant="outline" (clicked)="showTopup.set(false)">Anuluj</app-button>
              </div>
            }
          </div>
        </div>
      </app-card>

      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">Historia transakcji</h2>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (transactions().length === 0) {
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Brak transakcji</p>
      } @else {
        <div class="space-y-2">
          @for (t of transactions(); track t.id) {
            <app-card>
              <div class="p-3 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ t.description || t.type }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ t.createdAt | date:'d MMM yyyy, HH:mm' }}</p>
                  @if (t.relatedEvent) {
                    <a [routerLink]="['/events', t.relatedEvent.id]" class="text-xs text-highlight dark:text-highlight-light hover:underline">{{ t.relatedEvent.title }}</a>
                  }
                </div>
                <span class="text-sm font-bold" [class]="t.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ t.amount >= 0 ? '+' : '' }}{{ t.amount | number:'1.2-2' }} zł
                </span>
              </div>
            </app-card>
          }
        </div>
        @if (totalPages() > 1) {
          <div class="mt-4">
            <app-pagination [currentPage]="page()" [totalPages]="totalPages()" (pageChange)="onPageChange($event)"></app-pagination>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly snackbar = inject(SnackbarService);

  readonly balance = signal(0);
  readonly transactions = signal<WalletTransaction[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly showTopup = signal(false);
  readonly topupLoading = signal(false);
  topupAmount = 50;

  ngOnInit(): void {
    this.walletService.getBalance().subscribe({
      next: (w) => this.balance.set(w.balance),
    });
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.walletService.getTransactions(this.page(), 20).subscribe({
      next: (res) => {
        this.transactions.set(res.data);
        this.totalPages.set(Math.ceil(res.total / res.limit) || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.loadTransactions();
  }

  onTopup(): void {
    if (this.topupAmount < 1) return;
    this.topupLoading.set(true);
    this.walletService.initTopup(this.topupAmount).subscribe({
      next: (res) => {
        window.location.href = res.paymentUrl;
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Błąd płatności');
        this.topupLoading.set(false);
      },
    });
  }
}
