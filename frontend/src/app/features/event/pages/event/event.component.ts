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
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../../shared/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';
import { Event as EventModel, Participation } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';
import {
  EventNotificationBarsComponent,
  NotificationBarConfig,
} from '../../ui/event-notification-bars/event-notification-bars.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';

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
    CardComponent,
    EventNotificationBarsComponent,
    DateBadgeComponent,
    LayoutSlotDirective,
  ],
  templateUrl: './event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent implements OnInit, OnDestroy {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);
  readonly layoutConfig = inject(LayoutConfigService);

  // ── Reactive state ──
  readonly event = signal<EventModel | null>(null);

  readonly participants = signal<Participation[]>([]);
  readonly isLoading = signal(true);
  readonly joining = signal(false);

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

  readonly countdown = signal<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

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
      this.overlays.setEventContext(this.event(), this.participants(), this.isParticipant());
    });
    effect(() => {
      this.overlays.setIsOrganizer(this.isOrganizer());
    });
    effect(() => {
      this.overlays.setLoading(this.joining());
    });

    // Register overlay callbacks
    this.overlays.onJoinConfirmed(() => this.confirmJoin());
    this.overlays.onLeaveConfirmed(() => this.confirmLeave());
    this.overlays.onAuthSuccess(() => this.onAuthSuccess());
    this.overlays.onOpenChat(() => this.openChat());
    this.overlays.onPay(() => this.payEvent());
    this.overlays.onContactOrganizer(() => this.contactOrganizer());
  }

  ngOnInit(): void {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.isLoading.set(false);
        this.startCountdown(e.startsAt);
        this.checkOpenJoinParam();
      },
      error: () => this.isLoading.set(false),
    });
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (p) => this.participants.set(p),
    });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.overlays.clearCallbacks();
    this.overlays.setEventContext(null, []);
  }

  private startCountdown(startsAt: string): void {
    const update = () => {
      const diff = new Date(startsAt).getTime() - Date.now();

      if (diff <= 0) {
        this.countdown.set(null);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        return;
      }
      const absDiff = Math.abs(diff);
      this.countdown.set({
        days: Math.floor(absDiff / 86_400_000),
        hours: Math.floor((absDiff % 86_400_000) / 3_600_000),
        minutes: Math.floor((absDiff % 3_600_000) / 60_000),
        seconds: Math.floor((absDiff % 60_000) / 1000),
      });
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
          (p.status === 'APPLIED' || p.status === 'ACCEPTED' || p.status === 'PENDING_PAYMENT'),
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

  readonly notificationBars = computed<NotificationBarConfig[]>(() => {
    const bars: NotificationBarConfig[] = [];

    if (this.isParticipant()) {
      const isPending = this.participantStatus() === 'PENDING_PAYMENT';
      bars.push({
        id: 'participant',
        icon: 'check',
        iconColorClass: 'text-green-600 dark:text-green-400',
        title: isPending ? 'Oczekuje na płatność!' : 'Jesteś już zapisany!',
        subtitle: isPending
          ? 'Rozpocząłeś proces płatności za to wydarzenie.'
          : 'Dołączyłeś do tego wydarzenia.',
        buttonLabel: 'Szczegóły',
        bgClass: 'bg-green-100 dark:bg-green-900/20',
        borderClass: 'border border-green-200 dark:border-green-800',
      });
    }

    if (this.isOrganizer()) {
      bars.push({
        id: 'organizer',
        icon: 'shield',
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        title: 'Jesteś organizatorem',
        subtitle: 'Zarządzaj tym wydarzeniem.',
        buttonLabel: 'Opcje',
        bgClass: 'bg-blue-100 dark:bg-blue-900/20',
        borderClass: 'border border-blue-200 dark:border-blue-800',
      });
    }

    return bars;
  });

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
    this.joining.set(true);
    this.eventService.payEvent(this.eventId).subscribe({
      next: (result) => {
        this.joining.set(false);
        if (result.paidByVoucher) {
          this.snackbar.success('Opłacono voucherem!');
          this.overlays.setParticipantStatus('ACCEPTED');
          const userId = this.auth.currentUser()?.id;
          if (userId) {
            this.participants.update((prev) =>
              prev.map((pp) => (pp.userId === userId ? { ...pp, status: 'ACCEPTED' } : pp)),
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
    this.overlays.close();
    this.joining.set(true);
    this.eventService.leaveEvent(this.eventId).subscribe({
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
