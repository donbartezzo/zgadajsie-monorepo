import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { PaymentService } from '../../../../core/services/payment.service';

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
  event?: { id: string; title: string; city?: { slug: string } };
}
import { AccountContentComponent } from '../../../../shared/ui/account-nav-rail/account-content.component';

@Component({
  selector: 'app-my-payments',
  imports: [DatePipe, DecimalPipe, RouterLink, LoadingSpinnerComponent, AccountContentComponent],
  template: `
    <app-account-content>
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (payments().length === 0) {
        <p class="text-sm text-neutral-500 text-center py-8">Nie masz jeszcze żadnych płatności</p>
      } @else {
        <!-- Jedna tabela responsywna: na wąskich ekranach przewija się poziomo (overflow-x-auto) -->
        <div class="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500"
                >
                  <th class="px-3 py-2.5 sm:px-4">Wydarzenie</th>
                  <th class="whitespace-nowrap px-3 py-2.5 sm:px-4">Data</th>
                  <th class="px-3 py-2.5 text-right sm:px-4">Kwota</th>
                  <th class="px-3 py-2.5 sm:px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (p of payments(); track p.id) {
                  <tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td class="px-3 py-2.5 sm:px-4">
                      <a
                        [routerLink]="['/w', p.event?.city?.slug, p.event?.id]"
                        class="font-medium text-primary-500 hover:underline"
                        >{{ p.event?.title || 'Wydarzenie' }}</a
                      >
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-neutral-500 sm:px-4">
                      {{ p.createdAt | date: 'd MMM yyyy, HH:mm' }}
                    </td>
                    <td
                      class="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-neutral-900 sm:px-4"
                    >
                      {{ p.amount | number: '1.2-2' }} zł
                    </td>
                    <td [class]="'whitespace-nowrap px-3 py-2.5 sm:px-4 ' + statusClass(p.status)">
                      {{ statusLabel(p.status) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </app-account-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyPaymentsComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly payments = signal<PaymentItem[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.paymentService.getMyPayments().subscribe({
      next: (r) => {
        this.payments.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'Opłacona',
      REFUNDED: 'Zwrócona',
      VOUCHER_REFUNDED: 'Zwrot voucherem',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    if (status === 'COMPLETED') return 'text-success-400';
    if (status === 'REFUNDED' || status === 'VOUCHER_REFUNDED') return 'text-warning-300';
    return 'text-neutral-400';
  }
}
