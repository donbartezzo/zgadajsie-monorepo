import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../shared/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../shared/ui/confirm-modal/confirm-modal.service';
import {
  Event as EventModel,
  Participation,
  EnrollmentPhase,
  ParticipationStatus,
  WaitingReason,
} from '../../../shared/types';
import { getEnrollmentPhase } from '../../../shared/utils/enrollment-phase.util';
import { isEventJoinable, EventTimeStatus } from '../../../shared/utils/event-time-status.util';
import { NotificationBarConfig } from '../ui/event-notification-bars/event-notification-bars.component';

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

@Injectable({
  providedIn: 'root',
})
export class EventAreaService {
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // ── Core state ──
  readonly event = signal<EventModel | null>(null);
  readonly participants = signal<Participation[]>([]);
  readonly joining = signal(false);
  readonly loading = signal(true);

  private _eventId = '';
  private _citySlug = '';

  get eventId(): string {
    return this._eventId;
  }

  get citySlug(): string {
    return this._citySlug;
  }

  // ── Computed signals ──

  readonly enrollmentPhase = computed<EnrollmentPhase | null>(() => {
    const e = this.event();
    if (!e) return null;
    return e.enrollmentPhase ?? getEnrollmentPhase(e.startsAt, e.lotteryExecutedAt, e.status);
  });

  readonly eventTimeStatus = computed<EventTimeStatus | null>(() => {
    return this.event()?.eventTimeStatus ?? null;
  });

  readonly isCancelled = computed(() => this.event()?.status === 'CANCELLED');

  readonly currentUserParticipation = computed<Participation | null>(() => {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return null;
    return this.participants().find((p) => p.userId === userId) ?? null;
  });

  readonly participantStatus = computed<ParticipationStatus | null>(() => {
    return this.currentUserParticipation()?.status ?? null;
  });

  readonly waitingReason = computed<WaitingReason | null>(() => {
    return this.currentUserParticipation()?.waitingReason ?? null;
  });

  readonly currentParticipationId = computed<string | null>(() => {
    return this.currentUserParticipation()?.id ?? null;
  });

  readonly isParticipant = computed(() => {
    const p = this.currentUserParticipation();
    if (!p) return false;
    return p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'CONFIRMED';
  });

  readonly isOrganizer = computed(() => {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.event()?.organizerId === userId;
  });

  readonly canJoin = computed(() => {
    const e = this.event();
    if (!e) return false;
    if (!isEventJoinable(e.startsAt, e.status)) return false;
    const phase = this.enrollmentPhase();
    return phase === 'PRE_ENROLLMENT' || phase === 'OPEN_ENROLLMENT';
  });

  readonly isPaidEvent = computed(() => {
    const e = this.event();
    return e ? e.costPerPerson > 0 : false;
  });

  readonly maxSlots = computed(() => this.event()?.maxParticipants ?? 0);

  readonly participantCount = computed(() => this.participants().length);

  // ── Lifecycle ──

  init(eventId: string, citySlug: string): void {
    if (this.initialized && this._eventId === eventId) {
      return;
    }

    this._eventId = eventId;
    this._citySlug = citySlug;
    this.initialized = true;
    this.loading.set(true);

    this.loadData();
    this.startAutoRefresh();
    this.registerOverlayCallbacks();
  }

  destroy(): void {
    this.stopAutoRefresh();
    this.overlays.clearCallbacks();
    this.overlays.setEventContext(null);
    this.initialized = false;
    this._eventId = '';
    this._citySlug = '';
    this.event.set(null);
    this.participants.set([]);
    this.joining.set(false);
    this.loading.set(true);
  }

  // ── Data loading ──

  private loadData(): void {
    this.eventService.getEvent(this._eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.eventService.getParticipants(this._eventId).subscribe({
      next: (p) => this.participants.set(p),
    });
  }

  refreshEvent(): void {
    this.eventService.getEvent(this._eventId).subscribe({
      next: (e) => this.event.set(e),
    });
  }

  refreshParticipants(): void {
    this.eventService.getParticipants(this._eventId).subscribe({
      next: (p) => this.participants.set(p),
    });
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshEvent();
      this.refreshParticipants();
    }, AUTO_REFRESH_INTERVAL);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // ── Overlay management ──

  constructor() {
    // Setup overlay sync effects in injection context
    effect(
      () => {
        this.overlays.setEventContext(this.event(), this.isParticipant());
      },
      { allowSignalWrites: true },
    );
    effect(
      () => {
        this.overlays.setIsOrganizer(this.isOrganizer());
      },
      { allowSignalWrites: true },
    );
    effect(
      () => {
        this.overlays.setLoading(this.joining());
      },
      { allowSignalWrites: true },
    );
  }

  private registerOverlayCallbacks(): void {
    this.overlays.onJoinConfirmed(() => this.confirmJoin());
    this.overlays.onOpenChat(() => this.openChat());
    this.overlays.onPay(() => this.payEvent());
    this.overlays.onContactOrganizer(() => this.contactOrganizer());
    this.overlays.onLeaveRequested(() => this.requestLeave());
    this.overlays.onRejoinRequested(() => this.confirmJoin());
  }

  openJoinConfirmOverlay(): void {
    this.overlays.setParticipantStatus(this.participantStatus(), this.waitingReason());
    this.overlays.open('joinConfirm');
  }

  openJoinSheet(): void {
    if (this.auth.isLoggedIn()) {
      if (this.isParticipant()) {
        this.openJoinConfirmOverlay();
      } else {
        this.overlays.open('joinRules');
      }
    } else {
      this.overlays.open('auth');
    }
  }

  // ── Participant actions ──

  openChat(): void {
    this.overlays.close();
    this.router.navigate(['/w', this._citySlug, this._eventId, 'chat']);
  }

  contactOrganizer(): void {
    this.overlays.close();
    this.router.navigate(['/w', this._citySlug, this._eventId, 'host-chat']);
  }

  async requestLeave(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Wypisanie z wydarzenia',
      message: 'Czy na pewno chcesz wypisać się z tego wydarzenia? Stracisz swoje miejsce.',
      confirmLabel: 'Tak, wypisz mnie',
      cancelLabel: 'Anuluj',
      variant: 'danger',
    });
    if (!confirmed) return;

    const participationId = this.currentParticipationId();
    if (!participationId) return;

    this.overlays.close();
    this.joining.set(true);

    this.eventService.leaveParticipation(participationId).subscribe({
      next: () => {
        this.joining.set(false);
        this.snackbar.info('Wypisano z wydarzenia');
        this.refreshParticipants();
      },
      error: () => {
        this.snackbar.error('Nie udało się wypisać');
        this.joining.set(false);
      },
    });
  }

  confirmJoin(): void {
    this.overlays.close();
    this.joining.set(true);

    this.eventService
      .joinEvent(this._eventId)
      .pipe(finalize(() => this.joining.set(false)))
      .subscribe({
        next: (p) => {
          const toastMsg = this.getJoinSuccessMessage(p.status, p.waitingReason);
          this.snackbar.success(toastMsg);
          // Refresh participants first, then navigate
          this.eventService.getParticipants(this._eventId).subscribe({
            next: (participants) => {
              this.participants.set(participants);
              this.router.navigate(['/w', this._citySlug, this._eventId, 'participants']);
            },
          });
        },
        error: (err) => {
          this.snackbar.error(err.error?.message || 'Nie udało się dołączyć do wydarzenia');
        },
      });
  }

  payEvent(): void {
    const participationId = this.currentParticipationId();
    if (!participationId) return;

    this.joining.set(true);

    this.eventService.payParticipation(participationId).subscribe({
      next: (result) => {
        this.joining.set(false);
        if (result.paidByVoucher) {
          this.snackbar.success('Opłacono voucherem!');
          this.overlays.setParticipantStatus('CONFIRMED');
          this.refreshParticipants();
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

  // ── Helpers ──

  getJoinSuccessMessage(status: string, waitingReason?: string | null): string {
    if (status === 'CONFIRMED') return 'Dołączono do wydarzenia!';
    if (status === 'APPROVED') return 'Masz przyznane miejsce! Potwierdź udział.';
    if (status === 'PENDING') {
      if (waitingReason === 'NEW_USER') {
        return 'Zgłoszenie wysłane! Oczekujesz na akceptację organizatora.';
      }
      if (waitingReason === 'NO_SLOTS') {
        return 'Dodano do listy oczekujących. Powiadomimy Cię gdy zwolni się miejsce.';
      }
      if (waitingReason === 'PRE_ENROLLMENT') {
        return 'Zgłoszenie przyjęte! Miejsca zostaną przydzielone w losowaniu.';
      }
      return 'Zgłoszenie wysłane! Oczekujesz na akceptację.';
    }
    return 'Zgłoszenie wysłane!';
  }

  getParticipantBarConfig(status: string | null, isEnded = false): NotificationBarConfig {
    if (status === 'PENDING') {
      const phase = this.enrollmentPhase();
      const isPreEnroll = phase === 'PRE_ENROLLMENT';
      return {
        id: 'participant',
        icon: isPreEnroll ? 'users' : 'clock',
        iconColorClass: isPreEnroll ? 'text-info-600' : 'text-warning-600',
        title: isPreEnroll ? 'Jesteś wstępnie zgłoszony' : 'Zgłoszenie wysłane',
        subtitle: isPreEnroll
          ? 'Twoje miejsce zależy od losowania.'
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
        title: 'Zatwierdzone - potwierdź udział!',
        subtitle: 'Twoje miejsce zostało przyznane.',
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
    if (status === 'WITHDRAWN') {
      return {
        id: 'participant',
        icon: 'user-x',
        iconColorClass: 'text-neutral-500',
        title: 'Wypisano z wydarzenia',
        subtitle: 'Nie jesteś już uczestnikiem.',
        buttonLabel: 'Szczegóły',
        bgClass: 'bg-neutral-100',
        borderClass: 'border border-neutral-200',
      };
    }
    if (status === 'REJECTED') {
      return {
        id: 'participant',
        icon: 'x',
        iconColorClass: 'text-danger-500',
        title: 'Zgłoszenie odrzucone',
        subtitle: 'Organizator odrzucił Twoje zgłoszenie.',
        buttonLabel: 'Szczegóły',
        bgClass: 'bg-danger-50',
        borderClass: 'border border-danger-200',
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
}
