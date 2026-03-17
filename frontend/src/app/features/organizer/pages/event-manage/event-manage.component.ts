import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventService } from '../../../../core/services/event.service';
import { EventAnnouncementService } from '../../../../core/services/event-announcement.service';
import { FormsModule } from '@angular/forms';
import { ModerationService } from '../../../../core/services/moderation.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import {
  AnnouncementReceiptStats,
  Event,
  EventAnnouncement,
  ParticipantManageItem,
} from '../../../../shared/types';
import { EventStatus } from '@zgadajsie/shared';
import {
  EventLifecycleBannerComponent,
  LifecycleBannerVariant,
} from '../../../../shared/ui/event-lifecycle-banner/event-lifecycle-banner.component';
import { getEventTimeStatus } from '../../../../shared/utils/event-time-status.util';
import { paymentMethodLabel } from '../../../../shared/utils/payment.utils';
import { BottomOverlaysService } from '../../../../shared/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { EventAnnouncementsComponent } from '../../../event/ui/event-announcements/event-announcements.component';

@Component({
  selector: 'app-event-manage',
  imports: [
    DecimalPipe,
    IconComponent,
    ButtonComponent,
    CardComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    FormsModule,
    EventLifecycleBannerComponent,
    EventAnnouncementsComponent,
  ],
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold text-neutral-900 mb-4">Zarządzanie wydarzeniem</h1>

      @if (lifecycleBannerVariant(); as variant) {
      <div class="mb-4">
        <app-event-lifecycle-banner [variant]="variant" />
      </div>
      }

      <div class="grid grid-cols-3 gap-3 mb-6">
        <app-card>
          <div class="p-3 text-center">
            <p class="text-2xl font-bold text-neutral-900">{{ pendingList().length }}</p>
            <p class="text-xs text-neutral-500">Zgłoszenia</p>
          </div>
        </app-card>
        <app-card>
          <div class="p-3 text-center">
            <p class="text-2xl font-bold text-neutral-900">{{ activeList().length }}</p>
            <p class="text-xs text-neutral-500">Uczestnicy</p>
          </div>
        </app-card>
        <app-card>
          <div class="p-3 text-center">
            <p class="text-2xl font-bold text-neutral-900">{{ manageParticipants().length }}</p>
            <p class="text-xs text-neutral-500">Łącznie</p>
          </div>
        </app-card>
      </div>

      @if (loading()) {
      <app-loading-spinner />
      } @else {

      <!-- Oczekujące zgłoszenia -->
      @if (pendingList().length > 0) {
      <h2 class="text-sm font-semibold text-neutral-900 mb-3">Oczekujące zgłoszenia</h2>
      <div class="space-y-2 mb-6">
        @for (p of pendingList(); track p.id) {
        <app-card>
          <div class="p-3 flex items-center gap-3">
            <app-user-avatar
              [avatarUrl]="p.user.avatarUrl"
              [displayName]="p.user.displayName"
              size="sm"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-900 truncate">
                {{ p.user.displayName }}
              </p>
            </div>
            <div class="flex gap-1">
              <app-button variant="outline" size="sm" (clicked)="openChat(p.userId)">
                <app-icon name="message-circle" size="sm" />
              </app-button>
              <app-button variant="primary" size="sm" (clicked)="onApprove(p.id)">
                <app-icon name="check" size="sm" />
              </app-button>
              <app-button variant="danger" size="sm" (clicked)="onReject(p.id)">
                <app-icon name="x" size="sm" />
              </app-button>
            </div>
          </div>
        </app-card>
        }
      </div>
      }

      <!-- Uczestnicy (unified) -->
      @if (activeList().length > 0) {
      <h2 class="text-sm font-semibold text-neutral-900 mb-3">Uczestnicy</h2>

      @if (isPaidEvent()) {
      <div class="mb-4 flex items-center gap-3">
        <div class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
          <div
            class="h-full rounded-full bg-success-400 transition-all"
            [style.width.%]="paidPercent()"
          ></div>
        </div>
        <span class="text-xs font-medium text-neutral-600">
          {{ paidCount() }}/{{ activeList().length }} opłaconych
        </span>
        <span class="text-xs font-semibold text-neutral-900">
          {{ totalPaidAmount() | number : '1.2-2' }} zł
        </span>
      </div>
      }

      <div class="space-y-2">
        @for (p of activeList(); track p.id) {
        <app-card>
          <div class="p-3">
            <div class="flex items-center gap-3">
              <app-user-avatar
                [avatarUrl]="p.user.avatarUrl"
                [displayName]="p.user.displayName"
                size="sm"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">
                  {{ p.user.displayName }}
                </p>
                @if (isPaidEvent()) {
                <div class="flex items-center gap-2 mt-0.5">
                  <span [class]="paymentStatusClass(p)">{{ paymentStatusLabel(p) }}</span>
                  @if (p.payment) {
                  <span class="text-xs text-neutral-400">
                    {{ paymentMethodLabel(p.payment.method) }}
                  </span>
                  }
                </div>
                }
              </div>
              <div class="flex gap-1">
                @if (isPaidEvent() && !p.payment && (p.status === 'APPROVED' || p.status ===
                'CONFIRMED')) {
                <app-button variant="primary" size="sm" (clicked)="onMarkPaid(p.id)">
                  Oznacz jako opłacone
                </app-button>
                } @if (isPaidEvent() && p.payment?.status === 'COMPLETED') {
                <app-button variant="outline" size="sm" (clicked)="openCancelOverlay(p)">
                  <app-icon name="x" size="sm" />
                </app-button>
                }
                <app-button variant="outline" size="sm" (clicked)="openChat(p.userId)">
                  <app-icon name="message-circle" size="sm" />
                </app-button>
                <app-button variant="outline" size="sm" (clicked)="onReprimand(p.userId)">
                  <app-icon name="flag" size="sm" />
                </app-button>
                <app-button variant="danger" size="sm" (clicked)="onBan(p.userId)">
                  <app-icon name="shield-alert" size="sm" />
                </app-button>
              </div>
            </div>
          </div>
        </app-card>
        }
      </div>
      }

      <!-- Komunikaty -->
      <div class="mt-6 border-t border-neutral-100 pt-4">
        <h2 class="text-sm font-semibold text-neutral-900 mb-3">Wyślij komunikat</h2>
        <textarea
          class="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm
            text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500
            focus:ring-1 focus:ring-primary-500 focus:outline-none"
          rows="3"
          placeholder="Treść komunikatu..."
          [(ngModel)]="announcementMessage"
        ></textarea>
        <div class="mt-2 flex items-center gap-3">
          <select
            class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs
              text-neutral-900 focus:border-primary-500 focus:outline-none"
            [(ngModel)]="announcementPriority"
          >
            <option value="INFORMATIONAL">Informacyjny</option>
            <option value="ORGANIZATIONAL">Organizacyjny</option>
            <option value="CRITICAL">Krytyczny</option>
          </select>
          <app-button
            variant="primary"
            size="sm"
            [loading]="sendingAnnouncement()"
            (clicked)="sendAnnouncement()"
          >
            <app-icon name="send" size="xs" />
            Wyślij
          </app-button>
        </div>
        @if (lastAnnouncementStats(); as stats) {
        <div class="mt-3 flex items-center gap-4 text-xs text-neutral-500">
          <span>Wysłano do: {{ stats.total }}</span>
          <span>Wyświetlone: {{ stats.viewed }}/{{ stats.total }}</span>
          <span>Potwierdzone: {{ stats.confirmed }}/{{ stats.total }}</span>
        </div>
        }

        <app-event-announcements
          [announcements]="announcements()"
          [hasAnnouncements]="announcements().length > 0"
          [isLoggedIn]="true"
          mode="organizer"
        />
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventManageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly moderationService = inject(ModerationService);
  private readonly announcementService = inject(EventAnnouncementService);
  private readonly snackbar = inject(SnackbarService);
  private readonly breadcrumb = inject(BreadcrumbService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);

  readonly manageParticipants = signal<ParticipantManageItem[]>([]);
  readonly announcements = signal<EventAnnouncement[]>([]);
  readonly loading = signal(true);
  readonly eventData = signal<Event | null>(null);
  readonly sendingAnnouncement = signal(false);
  readonly lastAnnouncementStats = signal<AnnouncementReceiptStats | null>(null);
  announcementMessage = '';
  announcementPriority = 'INFORMATIONAL';
  private eventId = '';
  private citySlug = '';

  readonly paymentMethodLabel = paymentMethodLabel;

  readonly lifecycleBannerVariant = computed<LifecycleBannerVariant | null>(() => {
    const e = this.eventData();
    if (!e) return null;
    if (e.status === EventStatus.CANCELLED) return 'cancelled';
    const ts = getEventTimeStatus(e.startsAt, e.endsAt, e.status);
    if (ts === 'ONGOING') return 'ongoing';
    if (ts === 'ENDED') return 'ended';
    return null;
  });

  readonly isPaidEvent = computed(() => {
    const e = this.eventData();
    return e ? e.costPerPerson > 0 : false;
  });

  readonly pendingList = computed(() =>
    this.manageParticipants().filter((p) => p.status === 'PENDING'),
  );

  readonly activeList = computed(() =>
    this.manageParticipants().filter((p) => p.status === 'APPROVED' || p.status === 'CONFIRMED'),
  );

  readonly paidCount = computed(
    () => this.activeList().filter((p) => p.payment?.status === 'COMPLETED').length,
  );

  readonly totalPaidAmount = computed(() =>
    this.activeList()
      .filter((p) => p.payment?.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.payment?.organizerAmount ?? 0), 0),
  );

  readonly paidPercent = computed(() => {
    const total = this.activeList().length;
    return total > 0 ? (this.paidCount() / total) * 100 : 0;
  });

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.eventService.getEvent(this.eventId).subscribe((e) => {
      this.eventData.set(e);
      this.citySlug = e.city?.slug ?? '';
      this.breadcrumb.setContext({ citySlug: this.citySlug });
    });
    this.loadManageParticipants();
    this.loadAnnouncements();

    this.overlays.onCancelPaymentConfirmed((result) => {
      const payment = this.overlays.cancelPayment();
      if (!payment) return;
      this.eventService.cancelPayment(this.eventId, payment.id, result).subscribe({
        next: (items) => {
          this.manageParticipants.set(items);
          this.overlays.close();
          this.snackbar.success('Płatność anulowana');
        },
        error: (err) =>
          this.snackbar.error(err?.error?.message || 'Nie udało się anulować płatności'),
      });
    });
  }

  private loadManageParticipants(): void {
    this.eventService.getParticipantsManage(this.eventId).subscribe({
      next: (items) => {
        this.manageParticipants.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAnnouncements(): void {
    this.announcementService.getAnnouncements(this.eventId).subscribe({
      next: (res) => this.announcements.set(res.announcements),
    });
  }

  onApprove(id: string): void {
    this.eventService.approveParticipation(id).subscribe({
      next: () => {
        this.manageParticipants.update((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'APPROVED' } : p)),
        );
        this.snackbar.success('Zatwierdzono');
      },
    });
  }

  onReject(id: string): void {
    this.eventService.rejectParticipation(id).subscribe({
      next: () => {
        this.manageParticipants.update((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'REJECTED' } : p)),
        );
        this.snackbar.info('Odrzucono');
      },
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
    this.moderationService.banUser(userId, 'Ban od organizatora').subscribe({
      next: () => this.snackbar.info('Użytkownik zbanowany'),
      error: () => this.snackbar.error('Nie udało się zbanować'),
    });
  }

  async onMarkPaid(participationId: string): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Oznaczenie jako opłacone',
      message: 'Czy na pewno chcesz oznaczyć tego uczestnika jako opłaconego (gotówka)?',
      confirmLabel: 'Tak, oznacz',
      variant: 'info',
    });
    if (!confirmed) return;
    this.eventService.markAsPaid(this.eventId, participationId).subscribe({
      next: (items) => {
        this.manageParticipants.set(items);
        this.snackbar.success('Oznaczono jako opłacone');
      },
      error: (err) =>
        this.snackbar.error(err?.error?.message || 'Nie udało się oznaczyć płatności'),
    });
  }

  openCancelOverlay(p: ParticipantManageItem): void {
    if (!p.payment) return;
    this.overlays.openCancelPayment(p.payment, p.user.displayName);
  }

  sendAnnouncement(): void {
    if (!this.announcementMessage.trim()) {
      this.snackbar.error('Wpisz treść komunikatu');
      return;
    }
    this.sendingAnnouncement.set(true);
    this.announcementService
      .createAnnouncement(this.eventId, this.announcementMessage.trim(), this.announcementPriority)
      .subscribe({
        next: (res) => {
          this.snackbar.success(`Komunikat wysłany do ${res.dispatchedTo} uczestników`);
          this.announcementMessage = '';
          this.sendingAnnouncement.set(false);
          this.loadAnnouncementStats(res.announcementId);
          this.loadAnnouncements();
        },
        error: (err) => {
          this.snackbar.error(err?.error?.message || 'Nie udało się wysłać komunikatu');
          this.sendingAnnouncement.set(false);
        },
      });
  }

  openChat(userId: string): void {
    this.router.navigate(['/w', this.citySlug, this.eventId, 'host-chat', userId]);
  }

  paymentStatusLabel(p: ParticipantManageItem): string {
    if (!p.payment) {
      return p.status === 'APPROVED' ? 'Oczekuje na płatność' : '-';
    }
    const map: Record<string, string> = {
      COMPLETED: 'Opłacone',
      VOUCHER_REFUNDED: 'Zwrócone (voucher)',
      CANCELLED: 'Anulowane',
    };
    return map[p.payment.status] ?? p.payment.status;
  }

  paymentStatusClass(p: ParticipantManageItem): string {
    const base = 'text-xs font-medium px-1.5 py-0.5 rounded-full';
    if (!p.payment) {
      return p.status === 'APPROVED'
        ? `${base} bg-warning-50 text-warning-600`
        : `${base} text-neutral-400`;
    }
    const map: Record<string, string> = {
      COMPLETED: `${base} bg-success-50 text-success-600`,
      VOUCHER_REFUNDED: `${base} bg-neutral-100 text-neutral-500`,
      CANCELLED: `${base} bg-danger-50 text-danger-600`,
    };
    return map[p.payment.status] ?? `${base} text-neutral-400`;
  }

  private loadAnnouncementStats(announcementId: string): void {
    setTimeout(() => {
      this.announcementService.getStats(announcementId).subscribe({
        next: (stats) => this.lastAnnouncementStats.set(stats),
      });
    }, 2000);
  }
}
