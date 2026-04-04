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
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventService } from '../../../../core/services/event.service';
import { EventAnnouncementService } from '../../../../core/services/event-announcement.service';
import { FormsModule } from '@angular/forms';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import {
  applyProfileChangeToList,
  ProfileBroadcastService,
} from '../../../../core/services/profile-broadcast.service';
import {
  AnnouncementReceiptStats,
  Event,
  EventAnnouncement,
  EventSlotInfo,
} from '../../../../shared/types';
import {
  ParticipantSlotsGridComponent,
  ParticipantItem,
} from '../../../../shared/participant/ui/participant-slots-grid/participant-slots-grid.component';
import { EventStatus } from '@zgadajsie/shared';
import {
  EventLifecycleBannerComponent,
  LifecycleBannerVariant,
} from '../../../../shared/event/ui/event-lifecycle-banner/event-lifecycle-banner.component';
import { getEventTimeStatus } from '../../../../shared/utils/event-time-status.util';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
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
    ParticipantSlotsGridComponent,
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
                    <app-button
                      appearance="outline"
                      color="neutral"
                      size="sm"
                      (clicked)="openChat(p.userId)"
                    >
                      <app-icon name="message-circle" size="sm" />
                    </app-button>
                    <app-button
                      appearance="soft"
                      color="primary"
                      size="sm"
                      (clicked)="onApprove(p.id)"
                    >
                      <app-icon name="check" size="sm" />
                    </app-button>
                    <app-button
                      appearance="soft"
                      color="danger"
                      size="sm"
                      (clicked)="onReject(p.id)"
                    >
                      <app-icon name="x" size="sm" />
                    </app-button>
                  </div>
                </div>
              </app-card>
            }
          </div>
        }

        <!-- Uczestnicy (slot grid) -->
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
              {{ totalPaidAmount() | number: '1.2-2' }} zł
            </span>
          </div>
        }

        @if (eventData(); as _event) {
          <app-participant-slots-grid
            [event]="_event"
            [participants]="manageParticipants()"
            [slots]="slots()"
            (refreshNeeded)="onRefreshNeeded()"
          />
        }

        <!-- Komunikaty -->
        <div class="mt-6 border-t border-neutral-100 pt-4">
          <h2 class="text-sm font-semibold text-neutral-900 mb-3">Wyślij komunikat</h2>
          <textarea
            class="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm
            text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500
            focus:ring-1 focus:ring-primary-500 focus:outline-hidden"
            rows="3"
            placeholder="Treść komunikatu..."
            [(ngModel)]="announcementMessage"
          ></textarea>
          <div class="mt-2 flex items-center gap-3">
            <select
              class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs
              text-neutral-900 focus:border-primary-500 focus:outline-hidden"
              [(ngModel)]="announcementPriority"
            >
              <option value="INFORMATIONAL">Informacyjny</option>
              <option value="ORGANIZATIONAL">Organizacyjny</option>
              <option value="CRITICAL">Krytyczny</option>
            </select>
            <app-button
              appearance="soft"
              color="primary"
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
  private readonly announcementService = inject(EventAnnouncementService);
  private readonly snackbar = inject(SnackbarService);
  private readonly breadcrumb = inject(BreadcrumbService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

  readonly manageParticipants = signal<ParticipantItem[]>([]);
  readonly slots = signal<EventSlotInfo[]>([]);
  readonly announcements = signal<EventAnnouncement[]>([]);
  readonly loading = signal(true);
  readonly eventData = signal<Event | null>(null);
  readonly sendingAnnouncement = signal(false);
  readonly lastAnnouncementStats = signal<AnnouncementReceiptStats | null>(null);
  announcementMessage = '';
  announcementPriority = 'INFORMATIONAL';
  private eventId = '';

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
    this.eventId = this.route.snapshot.paramMap.get('id')!;
    this.loadEvent();
    this.loadManageParticipants();
    this.loadSlots();
    this.loadAnnouncements();

    // Subscribe to profile changes broadcast
    this.profileBroadcast.changes$.subscribe((change) => {
      const participants = this.manageParticipants();
      const updated = applyProfileChangeToList(participants, change);
      if (updated !== participants) {
        this.manageParticipants.set(updated);
      }
    });

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

  private loadEvent(): void {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (event) => {
        this.eventData.set(event);
        this.breadcrumb.setContext({ eventTitle: event.title });
      },
    });
  }

  private loadManageParticipants(): void {
    // Use same participants endpoint as public view for consistency
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (participants) => {
        this.manageParticipants.set(participants);
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.error('Nie udało się załadować uczestników');
        this.loading.set(false);
      },
    });
  }

  private loadSlots(): void {
    this.eventService.getSlots(this.eventId).subscribe({
      next: (slots) => this.slots.set(slots),
    });
  }

  private loadAnnouncements(): void {
    this.announcementService.getAnnouncements(this.eventId).subscribe({
      next: (res) => this.announcements.set(res.announcements),
    });
  }

  onApprove(id: string): void {
    this.eventService.assignSlot(id).subscribe({
      next: () => {
        this.manageParticipants.update((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'APPROVED' } : p)),
        );
        this.snackbar.success('Przydzielono miejsce');
      },
      error: (err) => this.snackbar.error(err?.error?.message || 'Brak wolnych miejsc'),
    });
  }

  onReject(id: string): void {
    this.eventService.releaseSlot(id).subscribe({
      next: () => {
        this.manageParticipants.update((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'REJECTED' } : p)),
        );
        this.snackbar.info('Odrzucono');
      },
      error: (err) => this.snackbar.error(err?.error?.message || 'Nie udało się odrzucić'),
    });
  }

  onRefreshNeeded(): void {
    this.loadManageParticipants();
    this.loadSlots();
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
    const citySlug = this.eventData()?.citySlug ?? '';
    this.router.navigate(['/w', citySlug, this.eventId, 'host-chat', userId]);
  }

  private loadAnnouncementStats(announcementId: string): void {
    setTimeout(() => {
      this.announcementService.getStats(announcementId).subscribe({
        next: (stats) => this.lastAnnouncementStats.set(stats),
      });
    }, 2000);
  }
}
