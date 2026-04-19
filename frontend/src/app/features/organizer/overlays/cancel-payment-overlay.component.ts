import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { ParticipantPaymentInfo } from '../../../shared/types';
import { paymentMethodLabel } from '../../../shared/utils/payment.utils';

export interface CancelPaymentResult {
  refundAsVoucher: boolean;
  notifyUser: boolean;
}

@Component({
  selector: 'app-cancel-payment-overlay',
  imports: [DecimalPipe, ButtonComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay
      [open]="true"
      title="Anulowanie płatności"
      icon="x"
      iconColor="danger"
      (closed)="close()"
    >
      <p class="mb-4 text-sm text-neutral-500 text-center">
        {{ userName() }} &mdash; {{ payment().amount | number: '1.2-2' }} zł
        <span class="text-neutral-400">({{ paymentMethodLabel(payment().method, '-') }})</span>
      </p>

      <label class="mb-3 flex items-center gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          [checked]="refundAsVoucher()"
          (change)="refundAsVoucher.set(!refundAsVoucher())"
          class="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
        />
        Zwróć kwotę na voucher organizatora ({{ payment().amount | number: '1.2-2' }} zł)
      </label>

      <label class="mb-5 flex items-center gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          [checked]="notifyUser()"
          (change)="notifyUser.set(!notifyUser())"
          class="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
        />
        Powiadom uczestnika o anulowaniu
      </label>

      <app-button
        appearance="soft"
        color="danger"
        size="md"
        [fullWidth]="true"
        (clicked)="confirm()"
      >
        Potwierdź anulowanie
      </app-button>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelPaymentOverlayComponent {
  readonly userName = input.required<string>();
  readonly payment = input.required<ParticipantPaymentInfo>();

  readonly confirmed = output<CancelPaymentResult>();
  readonly closed = output<void>();

  readonly refundAsVoucher = signal(true);
  readonly notifyUser = signal(true);

  confirm(): void {
    this.confirmed.emit({
      refundAsVoucher: this.refundAsVoucher(),
      notifyUser: this.notifyUser(),
    });
  }

  close(): void {
    this.closed.emit();
  }

  readonly paymentMethodLabel = paymentMethodLabel;
}
