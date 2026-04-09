import { computed, effect, inject, Injectable, NgZone, signal } from '@angular/core';
import { bufferTime, filter, finalize, forkJoin, map, Subject, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { EventRealtimeService } from '../../../core/services/event-realtime.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { ModalService } from '../../../shared/ui/modal/modal.service';
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

const AUTO_REFRESH_INTERVAL = 120000; // 120 seconds — safety-net fallback; primary updates via WebSocket

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
  private readonly modalService = inject(ModalService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);
  private readonly eventRealtime = inject(EventRealtimeService);

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private realtimeSubscription: Subscription | null = null;
  private refreshSubscription: Subscription | null = null;
  private initialized = false;
  private refreshInFlight = false;
  private refreshQueued = false;
  private autoRefreshPausedByOverlay = false;
  private autoRefreshPausedByVisibility = false;
  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  private readonly refreshCompletedSubject = new Subject<void>();
  readonly refreshCompleted$ = this.refreshCompletedSubject.asObservable();

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

    if (!this.isParticipant() && this.canJoin()) {
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

  init(eventId: string, citySlug: string, resolvedEvent?: EventModel): void {
    if (this.initialized && this._eventId === eventId) {
      return;
    }

    if (this.initialized) {
      this.destroy();
    }

    this._eventId = eventId;
    this._citySlug = citySlug;
    this.initialized = true;
    this.loading.set(true);

    if (this.isBrowser) {
      this.autoRefreshPausedByVisibility = document.hidden;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      this.eventRealtime.connect(eventId);
      // Run outside Angular zone: bufferTime uses RxJS asyncScheduler (setInterval internally),
      // which zone.js patches and tracks as a macrotask — keeping the app permanently unstable.
      // Re-enter zone only when performing the actual state update.
      this.ngZone.runOutsideAngular(() => {
        this.realtimeSubscription = this.eventRealtime
          .onInvalidation()
          .pipe(
            filter((payload) => payload.eventId === this._eventId),
            // Collect all scopes within 300ms window — handles burst events (e.g. lottery)
            bufferTime(300),
            filter((payloads) => payloads.length > 0),
          )
          .subscribe((payloads) => {
            this.ngZone.run(() => {
              const scopes = new Set(payloads.map((p) => p.scope));
              const needsAll = scopes.has('all');
              const needsParticipants =
                needsAll || scopes.has('participants') || scopes.has('slots');
              const needsEvent = needsAll || scopes.has('event');

              // Real-time events always refresh even during overlay
              if (needsAll || (needsParticipants && needsEvent)) {
                this.requestRefresh({ force: true, emitCompletion: false });
              } else if (needsParticipants) {
                this.requestRefresh({ force: true, emitCompletion: false, participantsOnly: true });
              } else if (needsEvent) {
                this.requestRefresh({ force: true, emitCompletion: false, eventOnly: true });
              }
            });
          });
      });
    }

    this.loadData(resolvedEvent);
    this.startAutoRefresh();
    this.registerOverlayCallbacks();
  }

  destroy(): void {
    this.stopAutoRefresh();
    this.initialized = false;
    this.refreshQueued = false;
    this.refreshInFlight = false;
    this.eventRealtime.disconnect();
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.autoRefreshPausedByOverlay = false;
    this.autoRefreshPausedByVisibility = false;
    this.overlays.clearCallbacks();
    this.overlays.setEventContext(null);
    this._eventId = '';
    this._citySlug = '';
    this.event.set(null);
    this.participants.set([]);
    this.joining.set(false);
    this.loading.set(true);
  }

  // ── Data loading ──

  private loadData(resolvedEvent?: EventModel): void {
    if (resolvedEvent) {
      this.event.set(resolvedEvent);
      this.requestRefresh({
        force: true,
        emitCompletion: false,
        markLoading: true,
        participantsOnly: true,
      });
      return;
    }

    this.requestRefresh({ force: true, emitCompletion: false, markLoading: true });
  }

  refreshEvent(): void {
    this.requestRefresh({ force: true });
  }

  refreshParticipants(): void {
    this.requestRefresh({ force: true });
  }

  private startAutoRefresh(): void {
    if (this.refreshInterval || !this.canAutoRefresh()) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.refreshInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.requestRefresh({ force: false });
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

  private syncAutoRefresh(): void {
    if (!this.initialized) {
      return;
    }

    if (this.canAutoRefresh()) {
      this.startAutoRefresh();
      this.flushQueuedRefresh();
      return;
    }

    this.stopAutoRefresh();
  }

  private readonly handleVisibilityChange = (): void => {
    if (!this.isBrowser) {
      return;
    }

    this.autoRefreshPausedByVisibility = document.hidden;
    this.syncAutoRefresh();

    if (
      !document.hidden &&
      !this.autoRefreshPausedByOverlay &&
      !this.refreshQueued &&
      !this.refreshInFlight
    ) {
      this.requestRefresh({ force: true });
      this.flushQueuedRefresh();
    }
  };

  private canAutoRefresh(): boolean {
    if (!this.initialized || !this.isBrowser) {
      return false;
    }

    return !this.autoRefreshPausedByOverlay && !this.autoRefreshPausedByVisibility;
  }

  private requestRefresh(
    options: {
      force?: boolean;
      emitCompletion?: boolean;
      markLoading?: boolean;
      participantsOnly?: boolean;
      eventOnly?: boolean;
    } = {},
  ): void {
    const force = options.force ?? false;
    const emitCompletion = options.emitCompletion ?? true;
    const markLoading = options.markLoading ?? false;
    const participantsOnly = options.participantsOnly ?? false;
    const eventOnly = options.eventOnly ?? false;

    if (!this.initialized) {
      return;
    }

    if (!force && !this.canAutoRefresh()) {
      this.refreshQueued = true;
      return;
    }

    if (this.refreshInFlight) {
      this.refreshQueued = true;
      return;
    }

    this.refreshInFlight = true;
    if (markLoading) {
      this.loading.set(true);
    }

    const request$ = participantsOnly
      ? this.eventService.getParticipants(this._eventId).pipe(
          map((participants): { event: EventModel | null; participants: Participation[] } => ({
            event: this.event(),
            participants,
          })),
        )
      : eventOnly
        ? this.eventService.getEvent(this._eventId).pipe(
            map((event): { event: EventModel | null; participants: Participation[] } => ({
              event,
              participants: this.participants(),
            })),
          )
        : forkJoin({
            event: this.eventService.getEvent(this._eventId),
            participants: this.eventService.getParticipants(this._eventId),
          });

    const refreshRequestSubscription = request$
      .pipe(
        finalize(() => {
          this.refreshInFlight = false;
          if (this.refreshSubscription === refreshRequestSubscription) {
            this.refreshSubscription = null;
          }
          if (markLoading) {
            this.loading.set(false);
          }
          this.flushQueuedRefresh();
        }),
      )
      .subscribe({
        next: ({ event, participants }) => {
          if (event) {
            this.event.set(event);
          }
          this.participants.set(participants);
          if (emitCompletion) {
            this.refreshCompletedSubject.next();
          }
        },
        error: (error: { status?: number }) => {
          if (this.isBrowser && error.status === 404) {
            this.refreshQueued = false;
            this.stopAutoRefresh();
            this.loading.set(false);
            this.event.set(null);
            this.participants.set([]);
            this.router.navigate(['/not-found'], {
              skipLocationChange: true,
              state: { reason: 'event-not-found', citySlug: this._citySlug },
            });
            return;
          }

          if (markLoading) {
            this.loading.set(false);
          }
        },
      });

    this.refreshSubscription = refreshRequestSubscription;
  }

  private flushQueuedRefresh(): void {
    if (!this.refreshQueued || this.refreshInFlight || !this.canAutoRefresh()) {
      return;
    }

    this.refreshQueued = false;
    this.requestRefresh({ force: true });
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
    effect(() => {
      const wasOverlayOpen = this.autoRefreshPausedByOverlay;
      this.autoRefreshPausedByOverlay = this.overlays.active() !== null;
      if (this.initialized) {
        this.syncAutoRefresh();
        if (
          wasOverlayOpen &&
          !this.autoRefreshPausedByOverlay &&
          !this.autoRefreshPausedByVisibility &&
          !this.refreshQueued &&
          !this.refreshInFlight
        ) {
          this.requestRefresh({ force: true });
        }
      }
    });
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
    this.overlays.onRejoinParticipantRequested((p) => this.confirmRejoinParticipant(p));
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

  openJoinWizardWithRole(roleKey?: string): void {
    if (this.auth.isLoggedIn()) {
      this.overlays.openJoinWizard({ preselectedRoleKey: roleKey });
    } else {
      this.overlays.open('auth');
    }
  }

  openJoinConfirm(): void {
    if (this.auth.isLoggedIn()) {
      this.openJoinConfirmOverlay();
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
        this.modalService.requestRefresh();
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

  /**
   * Public entry point for rejoining a specific participation by ID.
   * Used by the participant-slot-modal to avoid going through the overlay flow.
   */
  rejoinParticipantDirect(p: Participation): void {
    this.confirmRejoinParticipant(p);
  }

  private confirmRejoinParticipant(p: Participation): void {
    this.overlays.close();
    this.joining.set(true);

    // Always rejoin by participation ID to avoid creating a new User entity for guests.
    // joinGuest / joinEvent would create a duplicate record for guests.
    const source$ = this.eventService.rejoinParticipation(p.id);

    source$.pipe(finalize(() => this.joining.set(false))).subscribe({
      next: (result) => {
        const toastMsg = this.getJoinSuccessMessage(result.status, result.waitingReason);
        const label = p.isGuest ? `${p.user.displayName}: ` : '';
        this.snackbar.success(`${label}${toastMsg}`);
        this.eventService.getParticipants(this._eventId).subscribe({
          next: (participants) => {
            this.participants.set(participants);
            this.router.navigate(['/w', this._citySlug, this._eventId, 'participants']);
          },
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.snackbar.error(err.error?.message ?? 'Nie udało się dołączyć');
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
