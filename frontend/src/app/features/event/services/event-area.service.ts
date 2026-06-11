import { computed, effect, inject, Injectable, NgZone, signal } from '@angular/core';
import { bufferTime, filter, finalize, forkJoin, map, Subject, Subscription } from 'rxjs';
import { EventService } from '../../../core/services/event.service';
import { DisciplineProfileService } from '../../../core/services/discipline-profile.service';
import { EventRealtimeService } from '../../../core/services/event-realtime.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import {
  BottomOverlaysService,
  DisciplineProfileValue,
} from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { ModalService } from '../../../shared/ui/modal/modal.service';
import { ConfirmModalService } from '../../../shared/ui/confirm-modal/confirm-modal.service';
import {
  applyProfileChangeToList,
  ProfileBroadcastService,
} from '../../../core/services/profile-broadcast.service';
import { NavigationService } from '../../../core/services/navigation.service';
import {
  Event as EventModel,
  GuestIdentityData,
  Participation,
  ParticipationStatus,
  WaitingReason,
} from '../../../shared/types';
import { SemanticColor } from '../../../shared/types/colors';
import { MAX_GUESTS_PER_USER, MAX_GUESTS_PER_ORGANIZER } from '@zgadajsie/shared';
import {
  getEventLifecycleStatus,
  isEventJoinable,
  isPreEnrollment,
} from '../../../shared/utils/event-time-status.util';
import { getWaitingReasonToast } from '../../../shared/utils/waiting-reason-messages.util';
import { EventStatusBarConfig } from '../ui/event-status-bars/event-status-bars-inline/event-status-bars-inline.component';
import {
  EVENT_LIFECYCLE_CONFIG,
  EventLifecycleStatus,
  STATUS_BAR_ACTION_LABELS,
} from '../constants/event-status-messages';

const AUTO_REFRESH_INTERVAL = 120000; // 120 seconds - safety-net fallback; primary updates via WebSocket

@Injectable({
  providedIn: 'root',
})
export class EventAreaService {
  private readonly navigation = inject(NavigationService);
  private readonly eventService = inject(EventService);
  private readonly disciplineProfileService = inject(DisciplineProfileService);
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

  readonly lifecycleStatus = computed<EventLifecycleStatus | null>(() => {
    const e = this.event();
    if (!e) return null;
    return getEventLifecycleStatus(e.startsAt, e.endsAt, e.status);
  });

  readonly isPreEnrollment = computed(() => {
    const e = this.event();
    if (!e) return false;
    return isPreEnrollment(e.startsAt, e.lotteryExecutedAt, e.status);
  });

  readonly isCancelled = computed(() => this.event()?.status === 'CANCELLED');

  readonly currentUserParticipations = computed<Participation[]>(() => {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return [];
    return this.participants().filter(
      (p) => (!p.isGuest && p.userId === userId) || (p.isGuest && p.addedByUser?.id === userId),
    );
  });

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

  readonly isEnrolled = computed(() => {
    const p = this.currentUserParticipation();
    if (!p) return false;
    return p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'CONFIRMED';
  });

  readonly canLeave = computed(() => {
    const p = this.currentUserParticipation();
    if (!p) return false;
    const ls = this.lifecycleStatus();
    if (ls === 'ENDED' || ls === 'CANCELLED') return false;
    return p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'CONFIRMED';
  });

  readonly isOrganizer = computed(() => {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.event()?.organizerId === userId;
  });

  readonly canJoin = computed(() => {
    const e = this.event();
    if (!e) return false;
    return isEventJoinable(e.startsAt, e.status);
  });

  readonly needsConfirmation = computed(() => {
    const p = this.currentUserParticipation();
    if (!p) return false;
    return p.status === 'APPROVED' && p.slot?.confirmed === false;
  });

  readonly ctaLabel = computed(() => {
    if (!this.auth.isLoggedIn()) return 'Zaloguj się, aby dołączyć';
    return 'Zapisz się';
  });

  readonly isPaidEvent = computed(() => {
    const e = this.event();
    return e ? e.costPerPerson > 0 : false;
  });

  readonly maxSlots = computed(() => this.event()?.maxParticipants ?? 0);

  /** Liczba wszystkich zgłoszonych (wszystkie statusy). */
  readonly enrollmentCount = computed(() => this.participants().length);

  /** Liczba uczestników z przydzielonym miejscem (z backendu _count.participants). */
  readonly participantCount = computed(() => this.event()?._count?.participants ?? 0);

  /**
   * Global helper method to calculate participant count (with assigned slot) from any participants array.
   * Used by event cards and other components that don't have full EventAreaService.
   */
  static calculateParticipantCount(participants: { status: string }[]): number {
    return participants.filter((p) => p.status === 'APPROVED' || p.status === 'CONFIRMED').length;
  }

  readonly visibleAvatars = computed(() => this.participants().slice(0, 6));

  readonly lifecycleBannerVariant = computed(() => {
    const ls = this.lifecycleStatus();
    if (ls === 'CANCELLED') return 'cancelled' as const;
    if (ls === 'ONGOING') return 'ongoing' as const;
    if (ls === 'ENDED') return 'ended' as const;
    return null;
  });

  readonly notificationBars = computed<EventStatusBarConfig[]>(() => {
    const bars: EventStatusBarConfig[] = [];

    if (!this.event()) return bars;

    const lifecycleStatus = this.lifecycleStatus() ?? 'UPCOMING';
    const userParticipations = this.currentUserParticipations();
    const config = EVENT_LIFECYCLE_CONFIG[lifecycleStatus];

    // ── Urgent action bar (needsConfirmation) - highest priority ──
    if (this.needsConfirmation()) {
      bars.push({
        id: 'urgent-confirm',
        title: 'Wymagane potwierdzenie uczestnictwa',
        subtitle: 'Kliknij, aby potwierdzić swoje miejsce',
        bgClass: 'bg-warning-50',
        borderClass: 'border-2 border-warning-400',
      });
    }

    // ── Participation status bar (shown ONLY when UPCOMING + user has any participation) ──
    if (lifecycleStatus === 'UPCOMING' && userParticipations.length > 0) {
      bars.push({
        id: 'participation',
        title: 'Jesteś zapisany:',
        subtitle: 'Sprawdź szczegóły',
        bgClass: config.appearance.bgClass,
        borderClass: config.appearance.borderClass,
        enrollments: userParticipations.map((p) => ({
          id: p.userId,
          displayName: p.user?.displayName ?? '',
          avatarSeed: p.user?.avatarSeed ?? null,
        })),
      });
    }

    // ── Event status bar (shown when participation bar is NOT shown) ──
    if (bars.length === 0) {
      bars.push({
        id: 'status',
        title: config.title,
        subtitle: config.subtitle,
        bgClass: config.appearance.bgClass,
        borderClass: config.appearance.borderClass,
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
      // which zone.js patches and tracks as a macrotask - keeping the app permanently unstable.
      // Re-enter zone only when performing the actual state update.
      this.ngZone.runOutsideAngular(() => {
        this.realtimeSubscription = this.eventRealtime
          .onInvalidation()
          .pipe(
            filter((payload) => payload.eventId === this._eventId),
            // Collect all scopes within 300ms window - handles burst events (e.g. lottery)
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

      // Resolver runs in SSR context where localStorage is unavailable, so the
      // JWT cannot be attached to the request and currentUserAccess comes back null.
      // On the client, if the user is logged in but currentUserAccess is missing,
      // do a full event + participants refresh to get the correct isTrusted flag.
      const needsFullRefresh = this.auth.isLoggedIn() && !resolvedEvent.currentUserAccess;

      this.requestRefresh({
        force: true,
        emitCompletion: false,
        markLoading: true,
        participantsOnly: !needsFullRefresh,
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
            this.navigation.navigateToNotFoundWithReason('event-not-found');
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
    effect(() => this.overlays.setEventContext(this.event(), this.isEnrolled()));
    effect(() => this.overlays.setIsOrganizer(this.isOrganizer()));
    effect(() => this.overlays.setLoading(this.joining()));
    effect(() => this.overlays.setParticipants(this.participants()));
    effect(() => {
      const ls = this.lifecycleStatus();
      if (ls) this.overlays.setLifecycleStatus(ls);
    });
    effect(() => {
      const wasOverlayOpen = this.autoRefreshPausedByOverlay;
      this.autoRefreshPausedByOverlay = this.overlays.active() !== null;
      if (this.initialized) {
        this.syncAutoRefresh();
        // Skip the post-close refresh when a join action is in progress —
        // the action's own success handler will update participants after the POST completes.
        // This prevents a stale GET (fired before the POST) from racing with the fresh GET.
        if (
          wasOverlayOpen &&
          !this.autoRefreshPausedByOverlay &&
          !this.autoRefreshPausedByVisibility &&
          !this.refreshQueued &&
          !this.refreshInFlight &&
          !this.joining()
        ) {
          this.requestRefresh({ force: true });
        }
      }
    });

    // Show inactive event modal after data is loaded
    // Modal is displayed when:
    // - Event is CANCELLED (organizer cancelled it)
    // - Event is ENDED (already finished)
    // - Event is ONGOING (currently in progress)
    // These states mean the event is no longer joinable or modifiable
    effect(() => {
      const eventId = this._eventId;
      const loading = this.loading();

      if (!loading && eventId) {
        const ls = this.lifecycleStatus();
        if (ls === 'CANCELLED' || ls === 'ENDED' || ls === 'ONGOING') {
          this.showInactiveModal(ls);
        }
      }
    });
  }

  private registerOverlayCallbacks(): void {
    this.overlays.onJoinConfirmed((roleKey?: string) => this.confirmJoin(roleKey));
    this.overlays.onJoinGuestConfirmed((data) => this.confirmJoinGuest(data));
    this.overlays.onPay(() => this.payEvent());
    this.overlays.onRejoinParticipantRequested((p) => this.confirmRejoinParticipant(p));
    this.overlays.onAddGuestRequested(() => this.openAddGuest());
    this.overlays.onRoleChangeConfirmed((data) =>
      this.handleRoleChange(data.participationId, data.roleKey),
    );
    this.overlays.onEnrollmentActionClicked(() => this.handleNotificationBarAction('status'));
  }

  openJoinConfirmOverlay(): void {
    this.overlays.setParticipants(this.participants());
    this.overlays.open('joinConfirm');
  }

  openJoinSheet(): void {
    if (this.auth.isLoggedIn()) {
      if (this.isEnrolled()) {
        this.openJoinConfirmOverlay();
      } else {
        this.overlays.open('joinRules');
      }
    } else {
      this.overlays.open('auth');
    }
  }

  openJoinWizardWithRole(roleKey?: string, participationId?: string): void {
    if (this.auth.isLoggedIn()) {
      this.overlays.openJoinWizard({ preselectedRoleKey: roleKey, participationId });
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

    const isOrganizer = this.isOrganizer();
    const maxGuests = isOrganizer ? MAX_GUESTS_PER_ORGANIZER : MAX_GUESTS_PER_USER;

    const currentGuests = this.participants().filter(
      (p) => p.isGuest && p.addedByUser?.id === currentUserId && p.wantsIn,
    ).length;

    return Math.max(0, maxGuests - currentGuests);
  }

  handleNotificationBarAction(barId: string): void {
    if (barId === 'status') {
      this.openJoinSheet();
      return;
    }

    if (barId === 'participation' || barId.startsWith('participation-')) {
      this.openJoinConfirmOverlay();
    }
  }

  handleBarClick(barId: string): void {
    if (barId === 'urgent-confirm') {
      this.openJoinConfirmOverlay();
      return;
    }

    if (barId === 'status') {
      const config = EVENT_LIFECYCLE_CONFIG[this.lifecycleStatus() ?? 'UPCOMING'];
      const joinButton = this.canJoin()
        ? { label: STATUS_BAR_ACTION_LABELS.join, color: config.color as SemanticColor }
        : undefined;
      this.overlays.setEnrollmentActionButton(joinButton);
      this.overlays.open('enrollmentDetails');
      return;
    }

    if (barId === 'participation' || barId.startsWith('participation-')) {
      this.openJoinConfirmOverlay();
    }
  }

  // ── Participant actions ──

  openChat(): void {
    this.overlays.close();
    this.navigation.navigateToEventChat(this._eventId, this._citySlug);
  }

  contactOrganizer(): void {
    this.overlays.close();
    this.navigation.navigateToEventOrganizerChat(this._eventId, this._citySlug);
  }

  openOrganizerChats(): void {
    this.overlays.close();
    this.navigation.navigateToEventOrganizerChat(this._eventId, this._citySlug);
  }

  async requestLeave(): Promise<void> {
    if (!this.canLeave()) {
      this.snackbar.error('Nie można wypisać się z zakończonego wydarzenia');
      return;
    }

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

    this.joining.set(true);
    this.overlays.close();

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

  confirmSlot(): void {
    const participationId = this.currentParticipationId();
    if (!participationId) return;

    this.joining.set(true);
    this.overlays.close();

    this.eventService.confirmSlot(participationId).subscribe({
      next: () => {
        this.joining.set(false);
        this.snackbar.success('Uczestnictwo potwierdzone!');
        this.refreshParticipants();
        this.modalService.requestRefresh();
      },
      error: (err: { error?: { message?: string } }) => {
        this.snackbar.error(err.error?.message ?? 'Nie udało się potwierdzić uczestnictwa');
      },
    });
  }

  confirmJoin(roleKey?: string): void {
    this.joining.set(true);
    this.overlays.close();

    const config = this.overlays.wizardConfig();
    const participationId = config?.participationId;

    // If participationId exists, it's a rejoin - use rejoinParticipation
    // Otherwise, it's a new join - use joinEvent
    const source$ = participationId
      ? this.eventService.rejoinParticipation(participationId)
      : this.eventService.joinEvent(this._eventId, roleKey);

    source$.pipe(finalize(() => this.joining.set(false))).subscribe({
      next: (p) => {
        const toastMsg = this.getJoinSuccessMessage(p.status, p.waitingReason);
        this.snackbar.success(toastMsg);
        // Refresh participants first, then navigate
        this.eventService.getParticipants(this._eventId).subscribe({
          next: (participants) => {
            this.participants.set(participants);
            this.refreshCompletedSubject.next();
            this.navigation.navigateToEventParticipants(this._eventId, this._citySlug);
          },
        });
      },
      error: (err: {
        error?: { message?: string; suggestion?: string; code?: string; disciplineSlug?: string };
      }) => {
        // Brak profilu dyscypliny → otwórz modal, zapisz profil i ponów zapis.
        if (err.error?.code === 'DISCIPLINE_PROFILE_REQUIRED' && err.error.disciplineSlug) {
          this.openDisciplineProfileGate(err.error.disciplineSlug, () => this.confirmJoin(roleKey));
          return;
        }
        const msg = err.error?.message || 'Nie udało się dołączyć do wydarzenia';
        const suggestion = err.error?.suggestion;
        this.snackbar.error(suggestion ? `${msg}. ${suggestion}` : msg);
      },
    });
  }

  /**
   * Bramka profilu dyscypliny: otwiera wspólny modal, po zapisie upsertuje profil
   * i ponawia przerwaną akcję (zapis / rejoin).
   */
  private openDisciplineProfileGate(disciplineSlug: string, retry: () => void): void {
    this.overlays.openDisciplineProfile(
      { disciplineSlug, initial: null, submitLabel: 'Zapisz i dołącz' },
      (value) => {
        this.joining.set(true);
        this.disciplineProfileService
          .upsert(disciplineSlug, value)
          .pipe(finalize(() => this.joining.set(false)))
          .subscribe({
            next: () => {
              this.overlays.close();
              retry();
            },
            error: (e: { error?: { message?: string } }) =>
              this.snackbar.error(e.error?.message ?? 'Nie udało się zapisać profilu dyscypliny'),
          });
      },
    );
  }

  /**
   * Public entry point for rejoining a specific participation by ID.
   * Used by the participant-slot-modal to avoid going through the overlay flow.
   */
  rejoinParticipantDirect(p: Participation): void {
    this.confirmRejoinParticipant(p);
  }

  /**
   * Opens the role-change wizard for a given participation.
   * Preselects the participant's current role.
   */
  openChangeRoleWizardForParticipant(p: Participation): void {
    const currentRoleKey = p.slot?.roleKey ?? p.roleKey;
    this.overlays.openChangeRoleWizard(p.id, currentRoleKey);
  }

  private handleRoleChange(participationId: string, roleKey: string): void {
    this.joining.set(true);
    this.overlays.close();

    this.eventService
      .changeParticipationRole(participationId, roleKey)
      .pipe(finalize(() => this.joining.set(false)))
      .subscribe({
        next: (result) => {
          const toastMsg = this.getRoleChangeSuccessMessage(result.status);
          this.snackbar.success(toastMsg);
          this.eventService.getParticipants(this._eventId).subscribe({
            next: (participants) => {
              this.participants.set(participants);
              this.refreshCompletedSubject.next();
            },
          });
        },
        error: (err: { error?: { message?: string } }) => {
          this.snackbar.error(err.error?.message ?? 'Nie udało się zmienić roli');
        },
      });
  }

  private getRoleChangeSuccessMessage(status: string): string {
    switch (status) {
      case 'CONFIRMED':
      case 'APPROVED':
        return 'Rola zmieniona - masz przydzielone miejsce';
      case 'PENDING':
        return 'Rola zmieniona - oczekujesz na przydzielenie miejsca';
      default:
        return 'Rola zmieniona';
    }
  }

  private confirmRejoinParticipant(p: Participation): void {
    this.joining.set(true);
    this.overlays.close();

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
            this.refreshCompletedSubject.next();
            this.navigation.navigateToEventParticipants(this._eventId, this._citySlug);
          },
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.snackbar.error(err.error?.message ?? 'Nie udało się dołączyć');
      },
    });
  }

  // Po zebraniu tożsamości gościa w kreatorze otwieramy wspólny modal profilu dyscypliny
  // (poziom + wizytówka gościa), a po zapisie wykonujemy faktyczne dodanie gościa.
  confirmJoinGuest(identity: GuestIdentityData): void {
    const disciplineSlug = this.event()?.disciplineSlug;
    if (!disciplineSlug) {
      this.snackbar.error('Nie udało się dodać gościa: brak dyscypliny wydarzenia');
      return;
    }
    this.overlays.openDisciplineProfile(
      { disciplineSlug, initial: null, submitLabel: 'Dodaj gościa' },
      (profile) => this.submitGuest(identity, profile),
    );
  }

  private submitGuest(identity: GuestIdentityData, profile: DisciplineProfileValue): void {
    this.joining.set(true);
    this.overlays.close();

    this.eventService
      .joinGuest(this._eventId, {
        displayName: identity.displayName,
        levelSlug: profile.levelSlug,
        bio: profile.bio,
        roleKey: identity.roleKey,
        avatarSeed: identity.avatarSeed,
        userId: identity.userId,
      })
      .pipe(finalize(() => this.joining.set(false)))
      .subscribe({
        next: (p) => {
          const toastMsg = this.getJoinSuccessMessage(p.status, p.waitingReason);
          this.snackbar.success(`Dodano gościa: ${identity.displayName}. ${toastMsg}`);

          this.eventService.getParticipants(this._eventId).subscribe({
            next: (participants) => {
              this.participants.set(participants);
              this.refreshCompletedSubject.next();
              this.navigation.navigateToEventParticipantsWithQuery(this._eventId, this._citySlug, {
                newUserId: p.userId,
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

  private async showInactiveModal(status: 'ENDED' | 'ONGOING' | 'CANCELLED'): Promise<void> {
    const config = EVENT_LIFECYCLE_CONFIG[status];
    await this.confirmModal.confirm({
      title: config.title,
      message: config.description ?? '',
      confirmLabel: 'Rozumiem',
      showCancel: false,
      color: config.color,
      showIcon: false,
    });
  }
}
