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
import { IconName, IconComponent } from '../../../../core/icons/icon.component';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { DateBadgeComponent } from '../../../../shared/ui/date-badge/date-badge.component';
import { EventService } from '../../../../core/services/event.service';
import { EventAnnouncementService } from '../../../../core/services/event-announcement.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../../shared/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import {
  Event as EventModel,
  Participation,
  EventAnnouncement,
  EnrollmentPhase,
} from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';
import { getEventCountdown, EventCountdown } from '../../../../shared/utils/date.utils';
import { EventStatus } from '@zgadajsie/shared';
import {
  isEventJoinable,
  EventTimeStatus,
} from '../../../../shared/utils/event-time-status.util';
import { EnrollmentStatusBannerComponent } from '../../ui/enrollment-status-banner/enrollment-status-banner.component';
import { getLotteryThreshold } from '../../../../shared/utils/enrollment-phase.util';
import {
  EventNotificationBarsComponent,
  NotificationBarConfig,
} from '../../ui/event-notification-bars/event-notification-bars.component';
import { EventAnnouncementsComponent } from '../../ui/event-announcements/event-announcements.component';
import { NotificationStatusService } from '../../../../core/services/notification-status.service';

@Component({
  selector: 'app-event',
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    IconComponent,
    ButtonComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    EventNotificationBarsComponent,
    EventAnnouncementsComponent,
    DateBadgeComponent,
    LayoutSlotDirective,
    EnrollmentStatusBannerComponent,
  ],
  templateUrl: './event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent implements OnInit, OnDestroy {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly announcementService = inject(EventAnnouncementService);
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);
  readonly layoutConfig = inject(LayoutConfigService);
  private readonly notifStatus = inject(NotificationStatusService);

  // ── Reactive state ──
  readonly event = signal<EventModel | null>(null);

  readonly participants = signal<Participation[]>([]);
  readonly isLoading = signal(true);
  readonly joining = signal(false);
  readonly announcements = signal<EventAnnouncement[]>([]);
  readonly hasAnnouncements = signal(false);
  readonly loginQueryParams = { returnUrl: inject(Router).url };

  readonly visibleAvatars = computed(() => this.participants().slice(0, 6));
  readonly remainingCount = computed(() => Math.max(0, this.participants().length - 6));

  readonly fullAddress = computed(() => {
    const e = this.event();
    if (!e) return '';
    // const parts = [e.address, e.city?.name].filter(Boolean);
    // return parts.join(', ');

    return e.address;
  });

  readonly genderLabel = computed(() => {
    const g = this.event()?.gender;
    if (!g || g === 'ANY') return 'Wszyscy';
    if (g === 'MALE') return 'Mężczyźni';
    if (g === 'FEMALE') return 'Kobiety';
    return g;
  });

  readonly eventMonth = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase();
  });

  readonly eventDay = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).getDate().toString();
  });

  readonly eventStartTime = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  readonly ageRange = computed(() => {
    const e = this.event();
    if (!e) return null;
    if (e.ageMin && e.ageMax) return `${e.ageMin}–${e.ageMax} lat`;
    if (e.ageMin) return `od ${e.ageMin} lat`;
    if (e.ageMax) return `do ${e.ageMax} lat`;
    return null;
  });

  readonly countdown = signal<EventCountdown | null>(null);

  // @TODO: Replace hardcoded amenities with data from backend (event edit form)
  readonly amenities: { icon: IconName; label: string }[] = [
    { icon: 'home', label: 'Cicha okolica' },
    { icon: 'heart', label: 'Dobra atmosfera' },
    { icon: 'flag', label: 'Ławki' },
    { icon: 'sun', label: 'Oświetlenie' },
    { icon: 'shield', label: 'Parking' },
    { icon: 'star', label: 'Plastrony' },
  ];

  private get eventId(): string {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      throw new Error('Event ID is required');
    }
    return id;
  }

  constructor() {
    // Set cover image and white content background for event page
    this.layoutConfig.contentBgClass.set('bg-white');
    effect(() => {
      const e = this.event();
      if (e?.coverImage?.filename) {
        this.layoutConfig.coverImageUrl.set(coverImageUrl(e.coverImage.filename));
      }
      this.layoutConfig.titleText.set(e?.title || '');
    });

    // Sync local event/participants signals to the overlay service
    effect(() => {
      this.overlays.setEventContext(this.event(), this.isParticipant());
    });
    effect(() => {
      this.overlays.setIsOrganizer(this.isOrganizer());
    });
    effect(() => {
      this.overlays.setLoading(this.joining());
    });
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

    // Register overlay callbacks
    this.overlays.onJoinConfirmed(() => this.confirmJoin());
    this.overlays.onAuthSuccess(() => this.onAuthSuccess());
    this.overlays.onOpenChat(() => this.openChat());
    this.overlays.onPay(() => this.payEvent());
    this.overlays.onContactOrganizer(() => this.contactOrganizer());
    this.overlays.onCancelEvent(() => this.cancelEvent());
    this.overlays.onLeaveRequested(() => this.requestLeave());
  }

  ngOnInit(): void {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.isLoading.set(false);
        this.startCountdown(e.startsAt, e.endsAt);
        this.checkOpenJoinParam();
      },
      error: () => this.isLoading.set(false),
    });
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (p) => this.participants.set(p),
    });
    this.announcementService.getAnnouncements(this.eventId).subscribe({
      next: (res) => {
        this.announcements.set(res.announcements);
        this.hasAnnouncements.set(res.hasAnnouncements);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.overlays.clearCallbacks();
    this.overlays.setEventContext(null);
    this.notifStatus.clearConfig();
  }

  private startCountdown(startsAt: string, endsAt: string): void {
    const lotteryThreshold = getLotteryThreshold(startsAt);
    const update = () => {
      const now = new Date();
      const result = getEventCountdown(startsAt, endsAt, now, Infinity);
      this.countdown.set(result);

      if (now < lotteryThreshold && now < new Date(startsAt)) {
        const lotteryIso = lotteryThreshold.toISOString();
        const lotteryResult = getEventCountdown(lotteryIso, startsAt, now, Infinity);
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

  readonly isParticipant = computed(() => {
    const userId = this.auth.currentUser()?.id;
    return (
      !!userId &&
      this.participants().some(
        (p) =>
          p.userId === userId &&
          (p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'CONFIRMED'),
      )
    );
  });

  readonly isOrganizer = computed(() => {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.event()?.organizerId === userId;
  });

  readonly participantStatus = computed(() => {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return null;
    const p = this.participants().find((pp) => pp.userId === userId);
    return p?.status ?? null;
  });

  readonly eventTimeStatus = computed<EventTimeStatus | null>(() => {
    const e = this.event();
    return e?.eventTimeStatus ?? null;
  });

  readonly enrollmentPhase = computed<EnrollmentPhase | null>(() => {
    return this.event()?.enrollmentPhase ?? null;
  });

  readonly currentParticipationId = computed<string | null>(() => {
    return this.event()?.currentUserAccess?.participationId ?? null;
  });

  readonly canJoin = computed(() => {
    const e = this.event();
    if (!e) return false;
    if (!isEventJoinable(e.startsAt, e.status)) return false;
    const phase = this.enrollmentPhase();
    return phase === 'PRE_ENROLLMENT' || phase === 'OPEN_ENROLLMENT';
  });

  readonly isPreEnrollment = computed(() => this.enrollmentPhase() === 'PRE_ENROLLMENT');

  readonly participantCount = computed(() => this.participants().length);

  readonly ctaLabel = computed(() => {
    if (!this.auth.isLoggedIn()) return 'Zaloguj się, aby dołączyć';
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'Zgłoś się wstępnie';
    return 'Dołącz do wydarzenia';
  });

  readonly ctaLabelShort = computed(() => {
    const phase = this.enrollmentPhase();
    if (phase === 'PRE_ENROLLMENT') return 'Zgłoś się';
    return 'Dołącz';
  });

  readonly lotteryCountdown = signal<EventCountdown | null>(null);

  readonly isCancelled = computed(() => this.event()?.status === EventStatus.CANCELLED);

  readonly isBannedByOrganizer = computed(
    () => this.event()?.currentUserAccess?.isBannedByOrganizer === true,
  );

  readonly lifecycleBannerVariant = computed(() => {
    if (this.isCancelled()) return 'cancelled' as const;
    const ts = this.eventTimeStatus();
    if (ts === 'ONGOING') return 'ongoing' as const;
    if (ts === 'ENDED') return 'ended' as const;
    return null;
  });

  readonly notificationBars = computed<NotificationBarConfig[]>(() => {
    const bars: NotificationBarConfig[] = [];
    const status = this.participantStatus();
    const isEnded = this.eventTimeStatus() === 'ENDED' || this.isCancelled();

    if (this.isParticipant()) {
      const config = this.getParticipantBarConfig(status, isEnded);
      bars.push(config);
    }

    if (this.isOrganizer()) {
      bars.push({
        id: 'organizer',
        icon: 'shield',
        iconColorClass: 'text-info-600',
        title: 'Jesteś organizatorem',
        subtitle: 'Zarządzaj tym wydarzeniem.',
        buttonLabel: 'Opcje',
        bgClass: 'bg-info-50',
        borderClass: 'border border-info-200',
      });
    }

    return bars;
  });

  private getParticipantBarConfig(
    status: string | null,
    isEnded: boolean,
  ): NotificationBarConfig {
    if (status === 'PENDING') {
      const phase = this.enrollmentPhase();
      const isPreEnroll = phase === 'PRE_ENROLLMENT';
      return {
        id: 'participant',
        icon: isPreEnroll ? 'users' : 'clock',
        iconColorClass: isPreEnroll ? 'text-info-600' : 'text-warning-600',
        title: isPreEnroll ? 'Jesteś wstępnie zgłoszony' : 'Zgłoszenie wysłane',
        subtitle: isPreEnroll
          ? 'Twoje miejsce zależy od losowania. Wyniki poznasz po zamknięciu pre-zapisów.'
          : 'Oczekuje na akceptację organizatora.',
        buttonLabel: 'Szczegóły',
        bgClass: isPreEnroll ? 'bg-info-50' : 'bg-warning-50',
        borderClass: isPreEnroll ? 'border border-info-200' : 'border border-warning-200',
      };
    }
    if (status === 'APPROVED') {
      return {
        id: 'participant',
        icon: 'check',
        iconColorClass: 'text-info-600',
        title: 'Zatwierdzone — potwierdź udział!',
        subtitle: 'Twoje miejsce zostało przyznane. Potwierdź uczestnictwo.',
        buttonLabel: 'Potwierdź',
        bgClass: 'bg-info-50',
        borderClass: 'border border-info-200',
      };
    }
    if (status === 'CONFIRMED') {
      return {
        id: 'participant',
        icon: 'check',
        iconColorClass: 'text-success-600',
        title: isEnded ? 'Byłeś(aś) uczestnikiem' : 'Jesteś potwierdzonym uczestnikiem!',
        subtitle: isEnded ? 'To wydarzenie już się zakończyło.' : 'Twój udział jest potwierdzony.',
        buttonLabel: 'Szczegóły',
        bgClass: 'bg-success-50',
        borderClass: 'border border-success-200',
      };
    }
    return {
      id: 'participant',
      icon: 'check',
      iconColorClass: 'text-success-600',
      title: 'Jesteś zapisany',
      subtitle: 'Dołączyłeś do tego wydarzenia.',
      buttonLabel: 'Szczegóły',
      bgClass: 'bg-success-50',
      borderClass: 'border border-success-200',
    };
  }

  openJoinSheet(): void {
    if (this.auth.isLoggedIn()) {
      if (this.isParticipant()) {
        this.overlays.setParticipantStatus(this.participantStatus());
        this.overlays.open('joinConfirm');
      } else {
        this.overlays.open('joinRules');
      }
    } else {
      this.overlays.open('auth');
    }
  }

  confirmJoin(): void {
    this.overlays.close();
    this.joining.set(true);
    this.eventService.joinEvent(this.eventId).subscribe({
      next: (p) => {
        this.participants.update((prev) => {
          const idx = prev.findIndex((x) => x.userId === p.userId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = p;
            return updated;
          }
          return [...prev, p];
        });

        this.joining.set(false);
        this.overlays.setParticipantStatus(p.status);
        this.overlays.open('joinConfirm');
      },
      error: (err) => {
        console.error('Failed to join event:', err.error?.message);
        this.snackbar.error(err.error?.message || 'Nie udało się dołączyć do wydarzenia');
        this.joining.set(false);
      },
    });
  }

  payEvent(): void {
    const pId = this.currentParticipationId();
    if (!pId) return;
    this.joining.set(true);
    this.eventService.payParticipation(pId).subscribe({
      next: (result) => {
        this.joining.set(false);
        if (result.paidByVoucher) {
          this.snackbar.success('Opłacono voucherem!');
          this.overlays.setParticipantStatus('CONFIRMED');
          const userId = this.auth.currentUser()?.id;
          if (userId) {
            this.participants.update((prev) =>
              prev.map((pp) => (pp.userId === userId ? { ...pp, status: 'CONFIRMED' } : pp)),
            );
          }
          return;
        }
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
        }
      },
      error: (err) => {
        this.joining.set(false);
        this.snackbar.error(err.error?.message || 'Nie udało się zainicjować płatności');
      },
    });
  }

  onAuthSuccess(): void {
    this.overlays.open('joinRules');
  }

  openChat(): void {
    this.overlays.close();
    const slug = this.event()?.city?.slug;
    this.router.navigate(['/w', slug, this.eventId, 'chat']);
  }

  onFollow(): void {
    this.snackbar.info('Funkcja obserwowania będzie dostępna wkrótce');
  }

  openOrganizerChats(): void {
    this.overlays.close();
    const slug = this.event()?.city?.slug;
    this.router.navigate(['/w', slug, this.eventId, 'host-chat']);
  }

  openOrganizerActionsSheet(): void {
    this.overlays.open('organizerActions');
  }

  handleBarAction(barId: string): void {
    if (barId === 'participant') {
      this.openJoinSheet();
    } else if (barId === 'organizer') {
      this.openOrganizerActionsSheet();
    }
  }

  confirmAnnouncement(announcementId: string): void {
    this.announcementService.confirmManual(announcementId).subscribe({
      next: () => {
        this.announcements.update((prev) =>
          prev.map((a) =>
            a.id === announcementId && a.receipts?.length
              ? { ...a, receipts: [{ ...a.receipts[0], confirmedAt: new Date().toISOString() }] }
              : a,
          ),
        );
        this.snackbar.success('Potwierdzono odbiór komunikatu');
      },
      error: () => this.snackbar.error('Nie udało się potwierdzić odbioru'),
    });
  }

  confirmAllAnnouncements(): void {
    this.announcementService.confirmAllForEvent(this.eventId).subscribe({
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
      title: 'Odwołaj wydarzenie',
      message:
        'Czy na pewno chcesz odwołać to wydarzenie? Uczestnicy z opłaconymi zgłoszeniami otrzymają zwrot w formie vouchera.',
      confirmLabel: 'Odwołaj',
      cancelLabel: 'Anuluj',
      variant: 'danger',
    });
    if (!confirmed) return;

    this.eventService.cancelEvent(this.eventId).subscribe({
      next: () => {
        this.event.update((e) => (e ? { ...e, status: EventStatus.CANCELLED } : e));
        this.snackbar.success('Wydarzenie zostało odwołane');
      },
      error: (err: { error?: { message?: string } }) =>
        this.snackbar.error(err?.error?.message || 'Nie udało się odwołać wydarzenia'),
    });
  }

  contactOrganizer(): void {
    const organizerId = this.event()?.organizerId;
    if (!organizerId) return;
    this.overlays.close();
    const slug = this.event()?.city?.slug;
    this.router.navigate(['/w', slug, this.eventId, 'host-chat']);
  }

  async requestLeave(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Wypisanie z wydarzenia',
      message: 'Czy na pewno chcesz wypisać się z tego wydarzenia? Stracisz swoje miejsce.',
      confirmLabel: 'Tak, wypisz mnie',
      cancelLabel: 'Anuluj',
      variant: 'danger',
    });
    if (confirmed) {
      this.confirmLeave();
    }
  }

  confirmLeave(): void {
    const pId = this.currentParticipationId();
    if (!pId) return;
    this.overlays.close();
    this.joining.set(true);
    this.eventService.leaveParticipation(pId).subscribe({
      next: () => {
        const userId = this.auth.currentUser()?.id;
        this.participants.update((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, status: 'WITHDRAWN' } : p)),
        );
        this.snackbar.info('Wypisano z wydarzenia');
        this.joining.set(false);
      },
      error: () => {
        this.snackbar.error('Nie udało się wypisać');
        this.joining.set(false);
      },
    });
  }

  private checkOpenJoinParam(): void {
    if (this.route.snapshot.queryParams['openJoin'] && this.auth.isLoggedIn()) {
      if (this.isParticipant()) {
        this.overlays.setParticipantStatus(this.participantStatus());
        this.overlays.open('joinConfirm');
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
