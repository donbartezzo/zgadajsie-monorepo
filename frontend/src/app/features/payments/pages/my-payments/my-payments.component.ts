import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/ui/card/card.component';
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

@Component({
  selector: 'app-my-payments',
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    CardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="p-4 space-y-4">
      <h1 class="text-xl font-bold text-neutral-900">Moje płatności</h1>

      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else { @for (p of payments(); track p.id) {
      <app-card>
        <div class="flex justify-between items-center">
          <div>
            <a
              [routerLink]="['/w', p.event?.city?.slug, p.event?.id]"
              class="text-sm font-medium text-primary-500 hover:underline"
              >{{ p.event?.title || 'Wydarzenie' }}</a
            >
            <p class="text-xs text-neutral-400 mt-0.5">
              {{ p.createdAt | date : 'd MMM yyyy, HH:mm' }}
            </p>
          </div>
          <div class="text-right">
            <span class="text-sm font-semibold">{{ p.amount | number : '1.2-2' }} zł</span>
            <p
              [class]="
                'text-xs mt-0.5 ' +
                (p.status === 'COMPLETED'
                  ? 'text-success-400'
                  : p.status === 'REFUNDED' || p.status === 'VOUCHER_REFUNDED'
                  ? 'text-warning-300'
                  : 'text-neutral-400')
              "
            >
              {{ statusLabel(p.status) }}
            </p>
          </div>
        </div>
      </app-card>
      } @empty {
      <p class="text-sm text-neutral-500 text-center py-8">Nie masz jeszcze żadnych płatności</p>
      } }
    </div>
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
}
