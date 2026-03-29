import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { IconName, IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { EventService } from '../../../../core/services/event.service';
import { EventAnnouncementService } from '../../../../core/services/event-announcement.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import { EventAnnouncement } from '../../../../shared/types';
import {
  getEventCountdown,
  EventCountdown,
  EventStatus,
  nowInZone,
  toZonedDateTime,
} from '@zgadajsie/shared';
import { EnrollmentStatusBannerComponent } from '../../ui/enrollment-status-banner/enrollment-status-banner.component';
import { EventInfoGridComponent } from '../../../../shared/ui/event-info-grid/event-info-grid.component';
import { getLotteryThreshold } from '../../../../shared/utils/enrollment-phase.util';
import { EventInlineNotificationBarsComponent } from '../../ui/event-inline-notification-bars/event-inline-notification-bars.component';
import { EventAnnouncementsComponent } from '../../ui/event-announcements/event-announcements.component';
import { NotificationStatusService } from '../../../../core/services/notification-status.service';
import { EventAreaService } from '../../services/event-area.service';
import { formatEventAddress } from '../../../../shared/utils/event-format.utils';
import { TimeUnitPipe } from '../../../../shared/pipes/time-unit.pipe';

@Component({
  selector: 'app-event-detail',
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    BadgeComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    EventInlineNotificationBarsComponent,
    EventAnnouncementsComponent,
    EnrollmentStatusBannerComponent,
    EventHeroSlotsComponent,
    EventInfoGridComponent,
    TimeUnitPipe,
  ],
  templateUrl: './event-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent implements OnInit, OnDestroy {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly announcementService = inject(EventAnnouncementService);
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly notifStatus = inject(NotificationStatusService);
  protected readonly eventArea = inject(EventAreaService);

  // ── Delegated from EventAreaService ──
  readonly event = this.eventArea.event;
  readonly participants = this.eventArea.participants;
  readonly joining = this.eventArea.joining;
  readonly isLoading = this.eventArea.loading;
  readonly isParticipant = this.eventArea.isParticipant;
  readonly isOrganizer = this.eventArea.isOrganizer;
  readonly participantStatus = this.eventArea.participantStatus;
  readonly enrollmentPhase = this.eventArea.enrollmentPhase;
  readonly eventTimeStatus = this.eventArea.eventTimeStatus;
  readonly canJoin = this.eventArea.canJoin;
  readonly isCancelled = this.eventArea.isCancelled;
  readonly participantCount = this.eventArea.participantCount;
  readonly isBannedByOrganizer = this.eventArea.isBannedByOrganizer;
  readonly notificationBars = this.eventArea.notificationBars;
  readonly visibleAvatars = this.eventArea.visibleAvatars;
  readonly remainingCount = this.eventArea.remainingCount;
  readonly lifecycleBannerVariant = this.eventArea.lifecycleBannerVariant;

  // ── Local state ──
  readonly announcements = signal<EventAnnouncement[]>([]);
  readonly hasAnnouncements = signal(false);
  readonly countdown = signal<EventCountdown | null>(null);
  readonly lotteryCountdown = signal<EventCountdown | null>(null);
  readonly loginQueryParams = { returnUrl: inject(Router).url };
  readonly fullAddress = computed(() => formatEventAddress(this.event()?.address));

  // @TODO: Replace hardcoded amenities with data from backend (event edit form)
  readonly amenities: { icon: IconName; label: string }[] = [
    { icon: 'home', label: 'Cicha okolica' },
    { icon: 'heart', label: 'Dobra atmosfera' },
    { icon: 'flag', label: 'Ławki' },
    { icon: 'sun', label: 'Oświetlenie' },
    { icon: 'shield', label: 'Parking' },
    { icon: 'star', label: 'Plastrony' },
    { icon: 'hanger', label: 'Szatnia' },
    { icon: 'toilet', label: 'Toaleta' },
    { icon: 'ball', label: 'Piłki' },
    { icon: 'bookmark', label: 'Własna rezerwacja' },
  ];

  readonly isPreEnrollment = computed(() => this.enrollmentPhase() === 'PRE_ENROLLMENT');

  constructor() {
    // Sync lottery countdown to overlay service
    effect(() => {
      this.overlays.setLotteryCountdown(this.lotteryCountdown());
    });

    // Sync notification status for event
    effect(() => {
      const e = this.event();
      const isPart = this.isParticipant();
      if (e) {
        if (isPart) {
          this.notifStatus.setConfig({
            resourceType: 'event',
            resourceId: e.id,
            resourceLabel: e.title,
            subscribed: true,
            canToggle: false,
          });
        } else {
          this.notifStatus.clearConfig();
        }
      }
    });

    // Register auth success callback (specific to detail page)
    this.overlays.onAuthSuccess(() => this.onAuthSuccess());
    this.overlays.onCancelEvent(() => this.cancelEvent());

    // Setup countdown effect in injection context
    effect(
      () => {
        const e = this.event();
        if (e && !this.countdownInterval) {
          this.startCountdown(e.startsAt, e.endsAt);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.notifStatus.clearConfig();
  }

  private loadAnnouncements(): void {
    this.announcementService.getAnnouncements(this.eventArea.eventId).subscribe({
      next: (res) => {
        this.announcements.set(res.announcements);
        this.hasAnnouncements.set(res.hasAnnouncements);
      },
    });
  }

  private setupCountdown(): void {
    // Wait for event to be loaded, then start countdown
    effect(
      () => {
        const e = this.event();
        if (e && !this.countdownInterval) {
          this.startCountdown(e.startsAt, e.endsAt);
        }
      },
      { allowSignalWrites: true },
    );
  }

  private startCountdown(startsAt: string, endsAt: string): void {
    const lotteryThreshold = getLotteryThreshold(startsAt);
    const update = () => {
      const result = getEventCountdown(startsAt, endsAt, Infinity);
      this.countdown.set(result);

      const now = nowInZone();
      const startsAtDt = toZonedDateTime(startsAt);
      const lotteryThresholdDt = toZonedDateTime(lotteryThreshold);

      if (now < lotteryThresholdDt && now < startsAtDt) {
        const lotteryIso = lotteryThreshold.toISOString();
        const lotteryResult = getEventCountdown(lotteryIso, startsAt, Infinity);
        this.lotteryCountdown.set(lotteryResult);
      } else {
        this.lotteryCountdown.set(null);
      }

      if (!result && this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    };
    update();
    this.countdownInterval = setInterval(update, 1000);
  }

  onAuthSuccess(): void {
    this.overlays.open('joinRules');
  }

  openChat(): void {
    this.eventArea.openChat();
  }

  contactOrganizer(): void {
    this.eventArea.contactOrganizer();
  }

  confirmAnnouncement(announcementId: string): void {
    this.announcementService.confirmManual(announcementId).subscribe({
      next: () => {
        this.announcements.update((prev) =>
          prev.map((a) =>
            a.id === announcementId && a.receipts?.length
              ? { ...a, receipts: [{ ...a.receipts[0], confirmedAt: nowInZone().toISO() }] }
              : a,
          ),
        );
        this.snackbar.success('Potwierdzono odbiór komunikatu');
      },
      error: () => this.snackbar.error('Nie udało się potwierdzić odbioru'),
    });
  }

  confirmAllAnnouncements(): void {
    this.announcementService.confirmAllForEvent(this.eventArea.eventId).subscribe({
      next: (res) => {
        if (res.confirmed > 0) {
          const confirmedAt = res.confirmedAt;
          this.announcements.update((prev) =>
            prev.map((a) =>
              a.receipts?.length && !a.receipts[0].confirmedAt
                ? { ...a, receipts: [{ ...a.receipts[0], confirmedAt }] }
                : a,
            ),
          );
          this.snackbar.success(`Potwierdzono odbiór ${res.confirmed} komunikatów`);
        } else {
          this.snackbar.info('Brak niepotwierdzonych komunikatów');
        }
      },
      error: () => this.snackbar.error('Nie udało się potwierdzić odbioru komunikatów'),
    });
  }

  async cancelEvent(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Odwołać wydarzenie?',
      message:
        'Czy na pewno chcesz odwołać to wydarzenie? Uczestnicy z opłaconymi zgłoszeniami otrzymają zwrot w formie vouchera.',
      confirmLabel: 'Odwołaj',
      cancelLabel: 'Anuluj',
      color: 'danger',
    });
    if (!confirmed) return;

    this.eventService.cancelEvent(this.eventArea.eventId).subscribe({
      next: () => {
        this.eventArea.event.update((e) => (e ? { ...e, status: EventStatus.CANCELLED } : e));
        this.snackbar.success('Wydarzenie zostało odwołane');
      },
      error: (err: { error?: { message?: string } }) =>
        this.snackbar.error(err?.error?.message || 'Nie udało się odwołać wydarzenia'),
    });
  }

  private checkOpenJoinParam(): void {
    if (this.route.snapshot.queryParams['openJoin'] && this.auth.isLoggedIn()) {
      if (this.isParticipant()) {
        this.eventArea.openJoinConfirmOverlay();
      } else {
        this.overlays.open('joinRules');
      }
      this.removeOpenJoinFromUrl();
    }
  }

  private removeOpenJoinFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('openJoin');
    history.replaceState({}, '', url.toString());
  }
}
