import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { IconName, IconComponent } from '../../../../core/icons/icon.component';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../../shared/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { DirectMessageService } from '../../../../core/services/direct-message.service';
import { EventHeroComponent } from '../../../../shared/ui/event-hero/event-hero.component';
import { Event as EventModel, Participation } from '../../../../shared/types';

@Component({
  selector: 'app-event',
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    IconComponent,
    ButtonComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    CardComponent,
    EventHeroComponent,
  ],
  templateUrl: './event.component.html',
  styles: [
    `
      @keyframes slideUpBar {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      :host ::ng-deep .animate-slide-up-bar {
        animation: slideUpBar 0.35s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: '--hero-h: 300px' },
})
export class EventComponent implements OnInit, OnDestroy {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private sentinelObserver: IntersectionObserver | null = null;

  readonly participationSentinel = viewChild<ElementRef<HTMLElement>>('participationSentinel');
  readonly sentinelVisible = signal(true);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly dmService = inject(DirectMessageService);

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

  readonly heroSubtitle = computed(() => {
    const count = this.participants().length;
    return `${count} ${count === 1 ? 'uczestnik' : 'uczestników'}`;
  });

  readonly genderLabel = computed(() => {
    const g = this.event()?.gender;
    if (!g || g === 'ANY') return 'Wszyscy';
    if (g === 'MALE') return 'Mężczyźni';
    if (g === 'FEMALE') return 'Kobiety';
    return g;
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

    // Re-observe sentinel whenever the element appears/disappears (it's inside @if)
    effect(() => {
      const el = this.participationSentinel()?.nativeElement;
      this.sentinelObserver?.disconnect();
      if (el) {
        this.sentinelObserver = new IntersectionObserver(
          ([entry]) => this.sentinelVisible.set(entry.isIntersecting),
          { threshold: 0, rootMargin: '0px 0px -120px 0px' },
        );
        this.sentinelObserver.observe(el);
      } else {
        this.sentinelVisible.set(true);
      }
    });
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
    this.sentinelObserver?.disconnect();
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
              prev.map((pp) =>
                pp.userId === userId ? { ...pp, status: 'ACCEPTED' } : pp,
              ),
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
    this.router.navigate(['/events', this.eventId, 'chat']);
  }

  onFollow(): void {
    this.snackbar.info('Funkcja obserwowania będzie dostępna wkrótce');
  }

  contactOrganizer(): void {
    const organizerId = this.event()?.organizerId;
    if (!organizerId) return;
    this.dmService.getOrCreateConversation(organizerId, this.eventId).subscribe({
      next: (conv) => this.router.navigate(['/messages', conv.id]),
      error: () => this.snackbar.error('Nie udało się otworzyć konwersacji'),
    });
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
