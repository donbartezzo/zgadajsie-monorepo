import { computed, effect, inject, Injectable, NgZone, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../shared/ui/confirm-modal/confirm-modal.service';
import {
  applyProfileChangeToList,
  ProfileBroadcastService,
} from '../../../core/services/profile-broadcast.service';
import {
  Event as EventModel,
  Participation,
  EnrollmentPhase,
  ParticipationStatus,
  WaitingReason,
} from '../../../shared/types';
import { MAX_GUESTS_PER_USER, EventTimeStatus } from '@zgadajsie/shared';
import { getEnrollmentPhase } from '../../../shared/utils/enrollment-phase.util';
import { isEventJoinable } from '../../../shared/utils/event-time-status.util';
import {
  getWaitingReasonToast,
  getWaitingReasonBarTitle,
  getWaitingReasonBarSubtitle,
} from '../../../shared/utils/waiting-reason-messages.util';
import { getParticipationStatusConfig, ParticipationStatusOptions } from '../../../shared/utils';
import { NotificationBarConfig } from '../ui/event-inline-notification-bars/event-inline-notification-bars.component';
import type { IconName } from '../../../shared/ui/icon/icon.component';

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

@Injectable({
  providedIn: 'root',
})
export class EventAreaService {
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly snackbar = inject(SnackbarService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

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

  readonly isBannedByOrganizer = computed(
    () => this.event()?.currentUserAccess?.isBannedByOrganizer === true,
  );

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

  readonly isPaidEvent = computed(() => {
    const e = this.event();
    return e ? e.costPerPerson > 0 : false;
  });

  readonly maxSlots = computed(() => this.event()?.maxParticipants ?? 0);

  readonly participantCount = computed(() => this.participants().length);

  readonly visibleAvatars = computed(() => this.participants().slice(0, 6));

  readonly remainingCount = computed(() => Math.max(0, this.participants().length - 6));

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
      bars.push(this.getParticipantBarConfig(status, isEnded));
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
        borderClass: 'border-t border-b border-info-200',
      });
    }

    if (!this.isParticipant() && !this.isBannedByOrganizer() && this.canJoin()) {
      const phase = this.enrollmentPhase();
      bars.push({
        id: 'join',
        icon: 'user-plus',
        iconColorClass: 'text-white',
        title: this.ctaLabel(),
        subtitle: phase === 'PRE_ENROLLMENT' ? 'Zapisz się na listę wstępną' : 'Zgłoś chęć udziału',
        buttonLabel: this.ctaLabelShort(),
        bgClass: 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg',
        borderClass: 'border-t border-b border-primary-400',
        titleColorClass: 'text-white',
        subtitleColorClass: 'text-white/90',
        buttonAppearance: 'soft',
        buttonColor: 'primary',
      });
    }

    return bars;
  });

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
    this.ngZone.runOutsideAngular(() => {
      this.refreshInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.refreshEvent();
          this.refreshParticipants();
        });
      }, AUTO_REFRESH_INTERVAL);
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // ── Overlay management ──

  constructor() {
    // Subscribe to profile changes broadcast
    this.profileBroadcast.changes$.subscribe((change) => {
      const participants = this.participants();
      const updated = applyProfileChangeToList(participants, change);
      if (updated !== participants) {
        this.participants.set(updated);
      }
    });

    // Setup overlay sync effects in injection context
    effect(() => this.overlays.setEventContext(this.event(), this.isParticipant()));
    effect(() => this.overlays.setIsOrganizer(this.isOrganizer()));
    effect(() => this.overlays.setLoading(this.joining()));
    effect(() => this.overlays.setParticipants(this.participants()));
  }

  private registerOverlayCallbacks(): void {
    this.overlays.onJoinConfirmed((roleKey?: string) => this.confirmJoin(roleKey));
    this.overlays.onJoinGuestConfirmed((data: { displayName: string; roleKey?: string }) =>
      this.confirmJoinGuest(data.displayName, data.roleKey),
    );
    this.overlays.onOpenChat(() => this.openChat());
    this.overlays.onPay(() => this.payEvent());
    this.overlays.onContactOrganizer(() => this.contactOrganizer());
    this.overlays.onLeaveRequested(() => this.requestLeave());
    this.overlays.onRejoinRequested(() => this.confirmJoin());
    this.overlays.onAddGuestRequested(() => this.openAddGuest());
    this.overlays.onManageGuests(() => this.openManageGuests());
  }

  openJoinConfirmOverlay(): void {
    this.overlays.setParticipantStatus(this.participantStatus(), this.waitingReason());
    this.overlays.setParticipants(this.participants());
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

  openAddGuest(): void {
    if (!this.auth.isLoggedIn()) {
      this.overlays.open('auth');
      return;
    }

    const guestsRemaining = this.calculateGuestsRemaining();
    this.overlays.openJoinWizard({ startStep: 2, type: 'guest', guestsRemaining });
  }

  private calculateGuestsRemaining(): number {
    const currentUserId = this.auth.currentUser()?.id;
    if (!currentUserId) return MAX_GUESTS_PER_USER;

    const currentGuests = this.participants().filter(
      (p) => p.isGuest && p.addedByUserId === currentUserId && p.wantsIn,
    ).length;

    return Math.max(0, MAX_GUESTS_PER_USER - currentGuests);
  }

  openManageGuests(): void {
    this.overlays.close();
    this.router.navigate(['/w', this._citySlug, this._eventId, 'participants']);
  }

  handleNotificationBarAction(barId: string): void {
    if (barId === 'participant' || barId === 'join') {
      this.openJoinSheet();
      return;
    }

    if (barId === 'organizer') {
      this.overlays.open('organizerActions');
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

  openOrganizerChats(): void {
    this.overlays.close();
    this.router.navigate(['/w', this._citySlug, this._eventId, 'host-chat']);
  }

  async requestLeave(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Wypisać się z wydarzenia?',
      message: 'Czy na pewno chcesz wypisać się z tego wydarzenia? Stracisz swoje miejsce.',
      confirmLabel: 'Tak, wypisz mnie',
      cancelLabel: 'Anuluj',
      color: 'danger',
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

  confirmJoin(roleKey?: string): void {
    this.overlays.close();
    this.joining.set(true);

    this.eventService
      .joinEvent(this._eventId, roleKey)
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

  confirmJoinGuest(displayName: string, roleKey?: string): void {
    this.overlays.close();
    this.joining.set(true);

    this.eventService
      .joinGuest(this._eventId, displayName, roleKey)
      .pipe(finalize(() => this.joining.set(false)))
      .subscribe({
        next: (p) => {
          const toastMsg = this.getJoinSuccessMessage(p.status, p.waitingReason);
          this.snackbar.success(`Dodano gościa: ${displayName}. ${toastMsg}`);

          this.eventService.getParticipants(this._eventId).subscribe({
            next: (participants) => {
              this.participants.set(participants);
              this.router.navigate(['/w', this._citySlug, this._eventId, 'participants'], {
                queryParams: { newUserId: p.userId },
              });
            },
          });
        },
        error: (err) => {
          this.snackbar.error(err.error?.message || 'Nie udało się dodać gościa');
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
      return getWaitingReasonToast(waitingReason as WaitingReason | null);
    }
    return 'Zgłoszenie wysłane!';
  }

  getParticipantBarConfig(status: string | null, isEnded = false): NotificationBarConfig {
    const options: ParticipationStatusOptions = { isEnded };

    if (status === 'PENDING') {
      const reason = this.waitingReason();
      return this.getPendingBarConfig(reason);
    }

    const config = getParticipationStatusConfig(status as ParticipationStatus | null, options);

    return {
      id: 'participant',
      icon: config.icon as IconName,
      iconColorClass: config.iconColorClass,
      title: config.title,
      subtitle: config.subtitle,
      buttonLabel: config.buttonLabel,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
    };
  }

  // Removed getGuestBarConfig - guest management is now handled within the participant overlay

  private getPendingBarConfig(reason: WaitingReason | null): NotificationBarConfig {
    const isPreEnroll = reason === 'PRE_ENROLLMENT';
    const isBanned = reason === 'BANNED';

    return {
      id: 'participant',
      icon: isPreEnroll ? 'users' : isBanned ? 'alert-triangle' : 'clock',
      iconColorClass: isPreEnroll
        ? 'text-info-600'
        : isBanned
          ? 'text-danger-600'
          : 'text-warning-600',
      title: getWaitingReasonBarTitle(reason),
      subtitle: getWaitingReasonBarSubtitle(reason),
      buttonLabel: 'Szczegóły',
      bgClass: isPreEnroll ? 'bg-info-50' : isBanned ? 'bg-danger-50' : 'bg-warning-50',
      borderClass: isPreEnroll
        ? 'border-t border-b border-info-200'
        : isBanned
          ? 'border-t border-b border-danger-200'
          : 'border-t border-b border-warning-200',
    };
  }
}
