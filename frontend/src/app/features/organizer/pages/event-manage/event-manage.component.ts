import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventService } from '../../../../core/services/event.service';
import { ModerationService } from '../../../../core/services/moderation.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { Participation, UserBrief } from '../../../../shared/types';

interface EarningItem {
  id: string;
  amount: number;
  organizerAmount: number;
  paidAt?: string;
  user?: UserBrief;
}

@Component({
  selector: 'app-event-manage',
  imports: [
    CommonModule,
    DecimalPipe,
    IconComponent,
    ButtonComponent,
    CardComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Zarządzanie wydarzeniem
      </h1>

      <div class="grid grid-cols-3 gap-3 mb-6">
        <app-card
          ><div class="p-3 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ pending().length }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Zgłoszenia</p>
          </div></app-card
        >
        <app-card
          ><div class="p-3 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ accepted().length }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Uczestnicy</p>
          </div></app-card
        >
        <app-card
          ><div class="p-3 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ participants().length }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Łącznie</p>
          </div></app-card
        >
      </div>

      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Autoakceptacja</h2>
        <label class="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            [checked]="autoAccept()"
            (change)="toggleAutoAccept()"
            class="peer sr-only"
          />
          <div
            class="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-highlight dark:bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
          ></div>
        </label>
      </div>

      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else { @if (pending().length > 0) {
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Oczekujące zgłoszenia
      </h2>
      <div class="space-y-2 mb-6">
        @for (p of pending(); track p.id) {
        <app-card>
          <div class="p-3 flex items-center gap-3">
            <app-user-avatar
              [avatarUrl]="p.user?.avatarUrl"
              [displayName]="p.user?.displayName || ''"
              size="sm"
            ></app-user-avatar>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ p.user?.displayName }}
              </p>
            </div>
            <div class="flex gap-1">
              <app-button variant="outline" size="sm" (clicked)="openChat(p.userId)">
                <app-icon name="message-circle" size="sm"></app-icon>
              </app-button>
              <app-button variant="primary" size="sm" (clicked)="onAccept(p.id)"
                ><app-icon name="check" size="sm"></app-icon
              ></app-button>
              <app-button variant="danger" size="sm" (clicked)="onReject(p.id)"
                ><app-icon name="x" size="sm"></app-icon
              ></app-button>
            </div>
          </div>
        </app-card>
        }
      </div>
      } @if (accepted().length > 0) {
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Uczestnicy</h2>
      <div class="space-y-2">
        @for (p of accepted(); track p.id) {
        <app-card>
          <div class="p-3 flex items-center gap-3">
            <app-user-avatar
              [avatarUrl]="p.user?.avatarUrl"
              [displayName]="p.user?.displayName || ''"
              size="sm"
            ></app-user-avatar>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ p.user?.displayName }}
              </p>
            </div>
            <div class="flex gap-1">
              <app-button variant="outline" size="sm" (clicked)="openChat(p.userId)">
                <app-icon name="message-circle" size="sm"></app-icon>
              </app-button>
              <app-button variant="outline" size="sm" (clicked)="onReprimand(p.userId)">
                <app-icon name="flag" size="sm"></app-icon>
              </app-button>
              <app-button variant="danger" size="sm" (clicked)="onBan(p.userId)">
                <app-icon name="shield-alert" size="sm"></app-icon>
              </app-button>
            </div>
          </div>
        </app-card>
        }
      </div>
      } @if (earnings().length > 0) {
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
        Przychody ({{ totalEarnings() | number : '1.2-2' }} zł)
      </h2>
      <div class="space-y-2">
        @for (e of earnings(); track e.id) {
        <app-card>
          <div class="p-3 flex items-center gap-3">
            <app-user-avatar
              [avatarUrl]="e.user?.avatarUrl"
              [displayName]="e.user?.displayName || ''"
              size="sm"
            ></app-user-avatar>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ e.user?.displayName }}
              </p>
              <p class="text-xs text-gray-400">
                {{ e.organizerAmount | number : '1.2-2' }} zł netto
              </p>
            </div>
            <app-button variant="outline" size="sm" (clicked)="onRefundVoucher(e.id)">
              Voucher
            </app-button>
            <app-button variant="danger" size="sm" (clicked)="onRefundMoney(e.id)">
              Zwrot
            </app-button>
          </div>
        </app-card>
        }
      </div>
      } }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventManageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly moderationService = inject(ModerationService);
  private readonly paymentService = inject(PaymentService);
  private readonly snackbar = inject(SnackbarService);

  readonly participants = signal<Participation[]>([]);
  readonly earnings = signal<EarningItem[]>([]);
  readonly totalEarnings = signal(0);
  readonly loading = signal(true);
  readonly autoAccept = signal(false);
  private eventId = '';

  get pending(): () => Participation[] {
    return () => this.participants().filter((p) => p.status === 'PENDING');
  }

  get accepted(): () => Participation[] {
    return () => this.participants().filter((p) => p.status === 'ACCEPTED');
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEvent(this.eventId).subscribe((e) => this.autoAccept.set(e.autoAccept));
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (p) => {
        this.participants.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadEarnings();
  }

  private loadEarnings(): void {
    this.paymentService.getEventEarnings(this.eventId).subscribe({
      next: (r) => {
        this.earnings.set(r.payments);
        this.totalEarnings.set(r.totalAmount);
      },
    });
  }

  onAccept(id: string): void {
    this.eventService.acceptParticipation(id).subscribe({
      next: () => {
        this.participants.update((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'ACCEPTED' } : p)),
        );
        this.snackbar.success('Zaakceptowano');
      },
    });
  }

  onReject(id: string): void {
    this.eventService.rejectParticipation(id).subscribe({
      next: () => {
        this.participants.update((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'REJECTED' } : p)),
        );
        this.snackbar.info('Odrzucono');
      },
    });
  }

  toggleAutoAccept(): void {
    this.eventService.toggleAutoAccept(this.eventId).subscribe({
      next: (e) => this.autoAccept.set(e.autoAccept),
    });
  }

  onReprimand(userId: string): void {
    this.moderationService
      .createReprimand(userId, this.eventId, 'Reprymenda od organizatora')
      .subscribe({
        next: () => this.snackbar.info('Reprymenda wysłana'),
        error: () => this.snackbar.error('Nie udało się wysłać'),
      });
  }

  onBan(userId: string): void {
    this.moderationService.createBan(userId, 'Ban od organizatora').subscribe({
      next: () => this.snackbar.info('Użytkownik zbanowany'),
      error: () => this.snackbar.error('Nie udało się zbanować'),
    });
  }

  onRefundVoucher(paymentId: string): void {
    this.paymentService.refundAsVoucher(paymentId).subscribe({
      next: () => {
        this.snackbar.success('Voucher przyznany uczestnikowi');
        this.loadEarnings();
      },
      error: (err) =>
        this.snackbar.error(err?.error?.message || 'Nie udało się przyznać vouchera'),
    });
  }

  openChat(userId: string): void {
    this.router.navigate(['/events', this.eventId, 'host-chat', userId]);
  }

  onRefundMoney(paymentId: string): void {
    this.paymentService.refundAsMoney(paymentId).subscribe({
      next: () => {
        this.snackbar.success('Zwrot pieniężny zlecony');
        this.loadEarnings();
      },
      error: (err) =>
        this.snackbar.error(err?.error?.message || 'Nie udało się zlecić zwrotu pieniężnego'),
    });
  }
}
