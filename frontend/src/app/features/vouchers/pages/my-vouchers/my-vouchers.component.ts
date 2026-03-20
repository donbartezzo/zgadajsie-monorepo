import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { VoucherService } from '../../../../core/services/voucher.service';
import { OrganizerVoucherGroup } from '../../../../shared/types';

@Component({
  selector: 'app-my-vouchers',
  imports: [DecimalPipe, RouterLink, CardComponent, LoadingSpinnerComponent, UserAvatarComponent],
  template: `
    <div class="p-4 space-y-4">
      <h1 class="text-xl font-bold text-neutral-900">Moje vouchery</h1>
      <p class="text-sm text-neutral-500">
        Vouchery można wykorzystać przy zakupie udziału w wydarzeniach danego organizatora.
      </p>

      @if (loading()) {
      <app-loading-spinner />
      } @else { @for (group of groups(); track group.organizer.id) {
      <app-card>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <app-user-avatar
              [avatarUrl]="group.organizer.avatarUrl"
              [displayName]="group.organizer.displayName"
              size="md"
            />
            <div>
              <p class="text-sm font-medium text-neutral-900">
                {{ group.organizer.displayName }}
              </p>
              <p class="text-lg font-bold text-primary-500">
                {{ group.totalBalance | number : '1.2-2' }} zł
              </p>
            </div>
          </div>

          <div class="border-t border-neutral-100 pt-2 space-y-1.5">
            @for (v of group.vouchers; track v.id) {
            <div class="flex justify-between items-center text-xs text-neutral-500">
              <div class="flex items-center gap-1.5">
                <span>{{ sourceLabel(v.source) }}</span>
                @if (v.event) {
                <span>-</span>
                <a
                  [routerLink]="['/w', v.event.city?.slug, v.event.id]"
                  class="text-primary-500 hover:underline"
                  >{{ v.event.title }}</a
                >
                }
              </div>
              <span class="font-medium text-neutral-700">
                {{ v.remainingAmount | number : '1.2-2' }} zł
              </span>
            </div>
            }
          </div>
        </div>
      </app-card>
      } @empty {
      <p class="text-sm text-neutral-500 text-center py-8">Nie masz jeszcze żadnych voucherów</p>
      } }
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
