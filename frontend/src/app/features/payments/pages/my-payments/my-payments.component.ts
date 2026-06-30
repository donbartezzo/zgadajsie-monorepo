import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../../shared/ui/data-table/data-table.component';
import { DataTableCellDirective } from '../../../../shared/ui/data-table/data-table-cell.directive';
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
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    DataTableComponent,
    DataTableCellDirective,
    AccountContentComponent,
  ],
  template: `
    <app-account-content>
      <app-data-table
        [data]="payments()"
        [columns]="columns"
        [loading]="loading()"
        emptyMessage="Nie masz jeszcze żadnych płatności"
      >
        <ng-template appDataTableCell="event" let-p>
          <a
            [routerLink]="['/w', p.event?.city?.slug, p.event?.id]"
            class="font-medium text-primary-500 hover:underline"
            >{{ p.event?.title || 'Wydarzenie' }}</a
          >
        </ng-template>

        <ng-template appDataTableCell="date" let-p>
          <span class="whitespace-nowrap text-neutral-500">
            {{ p.createdAt | date: 'd MMM yyyy, HH:mm' }}
          </span>
        </ng-template>

        <ng-template appDataTableCell="amount" let-p>
          <span class="whitespace-nowrap font-semibold text-neutral-900">
            {{ p.amount | number: '1.2-2' }} zł
          </span>
        </ng-template>

        <ng-template appDataTableCell="status" let-p>
          <span [class]="'whitespace-nowrap ' + statusClass(p.status)">
            {{ statusLabel(p.status) }}
          </span>
        </ng-template>
      </app-data-table>
    </app-account-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyPaymentsComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly columns: DataTableColumn<PaymentItem>[] = [
    { key: 'event', header: 'Wydarzenie' },
    { key: 'date', header: 'Data', nowrap: true },
    { key: 'amount', header: 'Kwota', align: 'right', nowrap: true },
    { key: 'status', header: 'Status' },
  ];

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
