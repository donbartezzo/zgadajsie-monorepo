import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { VoucherService } from '../../../../core/services/voucher.service';
import { OrganizerVoucherGroup } from '../../../../shared/types';

@Component({
  selector: 'app-my-vouchers',
  imports: [DecimalPipe, RouterLink, CardComponent, LoadingSpinnerComponent],
  template: `
    <div class="p-4 space-y-4">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Moje vouchery</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Vouchery można wykorzystać przy zakupie udziału w wydarzeniach danego organizatora.
      </p>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        @for (group of groups(); track group.organizer.id) {
          <app-card>
            <div class="p-4 space-y-3">
              <div class="flex items-center gap-3">
                @if (group.organizer.avatarUrl) {
                  <img
                    [src]="group.organizer.avatarUrl"
                    [alt]="group.organizer.displayName"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                } @else {
                  <div
                    class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500"
                  >
                    {{ group.organizer.displayName.charAt(0).toUpperCase() }}
                  </div>
                }
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ group.organizer.displayName }}
                  </p>
                  <p class="text-lg font-bold text-highlight">
                    {{ group.totalBalance | number: '1.2-2' }} zł
                  </p>
                </div>
              </div>

              <div class="border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1.5">
                @for (v of group.vouchers; track v.id) {
                  <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <div class="flex items-center gap-1.5">
                      <span>{{ sourceLabel(v.source) }}</span>
                      @if (v.event) {
                        <span>—</span>
                        <a
                          [routerLink]="'/events/' + v.event.id"
                          class="text-highlight hover:underline"
                        >{{ v.event.title }}</a>
                      }
                    </div>
                    <span class="font-medium text-gray-700 dark:text-gray-300">
                      {{ v.remainingAmount | number: '1.2-2' }} zł
                    </span>
                  </div>
                }
              </div>
            </div>
          </app-card>
        } @empty {
          <p class="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            Nie masz jeszcze żadnych voucherów
          </p>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyVouchersComponent implements OnInit {
  private readonly voucherService = inject(VoucherService);

  readonly groups = signal<OrganizerVoucherGroup[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.voucherService.getMyVouchers().subscribe({
      next: (data) => {
        this.groups.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sourceLabel(source: string): string {
    const map: Record<string, string> = {
      EVENT_CANCELLATION: 'Odwołanie wydarzenia',
      MANUAL_REFUND: 'Zwrot od organizatora',
      MANUAL_CREDIT: 'Przyznany przez organizatora',
    };
    return map[source] ?? source;
  }
}
