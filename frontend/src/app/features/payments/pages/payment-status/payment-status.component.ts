import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { PaymentService } from '../../../../core/services/payment.service';
import { Payment } from '../../../../shared/types/payment.interface';

type PaymentStatusState =
  | 'loading'
  | 'success'
  | 'failed'
  | 'accepted'
  | 'pending'
  | 'not_found'
  | 'invalid';

@Component({
  selector: 'app-payment-status',
  imports: [RouterLink, CardComponent, IconComponent, ButtonComponent],
  template: `
    <div class="p-4 flex items-center justify-center min-h-[60vh]">
      <app-card>
        <div class="text-center space-y-4 max-w-md">
          @switch (status()) { @case ('loading') {
          <div class="space-y-4">
            <div class="w-16 h-16 mx-auto rounded-full bg-info-50 flex items-center justify-center">
              <app-icon name="loader" size="lg" class="text-info-400 animate-spin" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Sprawdzanie statusu płatności...</h1>
            <p class="text-sm text-neutral-500">Weryfikujemy status Twojej płatności.</p>
          </div>
          } @case ('success') { @let _payment = payment();
          <div class="space-y-4">
            <div
              class="w-16 h-16 mx-auto rounded-full bg-success-50 flex items-center justify-center"
            >
              <app-icon name="check" size="lg" class="text-success-400" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Płatność udana!</h1>
            <p class="text-sm text-neutral-500">
              Twoja płatność została zaksięgowana. Dołączyłeś do wydarzenia.
            </p>
            @if (_payment?.event; as event) {
            <div class="bg-neutral-50 rounded-lg p-3 text-left">
              <p class="text-sm font-medium text-neutral-900">{{ event.title }}</p>
              <p class="text-xs text-neutral-500 mt-1">Kwota: {{ _payment?.amount }} PLN</p>
            </div>
            <a [routerLink]="['/w', event.city?.slug, event.id]">
              <app-button variant="primary">Przejdź do wydarzenia</app-button>
            </a>
            } @else {
            <a routerLink="/profile/participations">
              <app-button variant="primary">Moje uczestnictwa</app-button>
            </a>
            }
          </div>
          } @case ('accepted') { @let _payment = payment();
          <div class="space-y-4">
            <div class="w-16 h-16 mx-auto rounded-full bg-info-50 flex items-center justify-center">
              <app-icon name="clock" size="lg" class="text-info-400" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Płatność przyjęta</h1>
            <p class="text-sm text-neutral-500">
              Twoja płatność została przyjęta do realizacji. Potwierdzenie pojawi się w ciągu kilku
              chwil.
            </p>
            @if (_payment?.event; as event) {
            <div class="bg-neutral-50 rounded-lg p-3 text-left">
              <p class="text-sm font-medium text-neutral-900">{{ event.title }}</p>
              <p class="text-xs text-neutral-500 mt-1">Kwota: {{ _payment?.amount }} PLN</p>
            </div>
            }
            <app-button (click)="checkStatus()" variant="outline">Sprawdź ponownie</app-button>
            @if (_payment?.event; as event) {
            <a [routerLink]="['/w', event.city?.slug, event.id]">
              <app-button variant="primary">Przejdź do wydarzenia</app-button>
            </a>
            } @else {
            <a routerLink="/profile/participations">
              <app-button variant="primary">Moje uczestnictwa</app-button>
            </a>
            }
          </div>
          } @case ('failed') { @let _payment = payment();
          <div class="space-y-4">
            <div
              class="w-16 h-16 mx-auto rounded-full bg-danger-50 flex items-center justify-center"
            >
              <app-icon name="x" size="lg" class="text-danger-400" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Płatność nieudana</h1>
            <p class="text-sm text-neutral-500">
              Twoja płatność nie została zrealizowana. Spróbuj ponownie.
            </p>
            @if (_payment?.event; as event) {
            <a [routerLink]="['/w', event.city?.slug, event.id]">
              <app-button variant="outline">Wróć do wydarzenia</app-button>
            </a>
            }
            <a routerLink="/profile/participations">
              <app-button variant="primary">Moje uczestnictwa</app-button>
            </a>
          </div>
          } @case ('pending') {
          <div class="space-y-4">
            <div
              class="w-16 h-16 mx-auto rounded-full bg-warning-50 flex items-center justify-center"
            >
              <app-icon name="clock" size="lg" class="text-warning-400" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Płatność w trakcie</h1>
            <p class="text-sm text-neutral-500">
              Twoja płatność jest przetwarzana. Status może zaktualizować się za kilka chwil.
            </p>
            <app-button (click)="checkStatus()" variant="outline">Sprawdź ponownie</app-button>
            <a routerLink="/profile/participations">
              <app-button variant="primary">Moje uczestnictwa</app-button>
            </a>
          </div>
          } @case ('not_found') {
          <div class="space-y-4">
            <div
              class="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center"
            >
              <app-icon name="search" size="lg" class="text-neutral-600" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Nie znaleziono płatności</h1>
            <p class="text-sm text-neutral-500">
              Nie znaleziono płatności o podanym identyfikatorze.
            </p>
            <a routerLink="/profile/participations">
              <app-button variant="primary">Moje uczestnictwa</app-button>
            </a>
          </div>
          } @case ('invalid') {
          <div class="space-y-4">
            <div
              class="w-16 h-16 mx-auto rounded-full bg-warning-50 flex items-center justify-center"
            >
              <app-icon name="alert-triangle" size="lg" class="text-warning-400" />
            </div>
            <h1 class="text-xl font-bold text-neutral-900">Nieprawidłowy identyfikator</h1>
            <p class="text-sm text-neutral-500">Identyfikator płatności jest nieprawidłowy.</p>
            <a routerLink="/profile/participations">
              <app-button variant="primary">Moje uczestnictwa</app-button>
            </a>
          </div>
          } }
        </div>
      </app-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentStatusComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly paymentService = inject(PaymentService);

  readonly status = signal<PaymentStatusState>('loading');
  readonly payment = signal<Payment | null>(null);
  private tpayResult: string | null = null;

  ngOnInit(): void {
    this.checkStatus();
  }

  checkStatus(): void {
    const intentId = this.route.snapshot.queryParamMap.get('intentId');
    const paymentId = this.route.snapshot.queryParamMap.get('paymentId');
    const result = this.route.snapshot.queryParamMap.get('result');

    if (!intentId && !paymentId) {
      this.status.set('invalid');
      return;
    }

    this.tpayResult = result;

    if (result === 'error') {
      this.status.set('failed');
      return;
    }

    this.status.set('loading');

    const request$ = paymentId
      ? this.paymentService.getPaymentStatus(paymentId)
      : this.paymentService.getPaymentStatusByIntentId(intentId!);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => this.handlePaymentResponse(p),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private handlePaymentResponse(p: Payment): void {
    this.payment.set(p);

    switch (p.status) {
      case 'COMPLETED':
        this.status.set('success');
        break;
      case 'FAILED':
      case 'REFUNDED':
      case 'VOUCHER_REFUNDED':
        this.status.set('failed');
        break;
      case 'PENDING':
        // result=success from Tpay means payment was submitted, but not yet confirmed by webhook
        this.status.set(this.tpayResult === 'success' ? 'accepted' : 'pending');
        break;
      default:
        this.status.set('not_found');
    }
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 404) {
      this.status.set('not_found');
    } else {
      this.status.set('failed');
    }
  }
}
