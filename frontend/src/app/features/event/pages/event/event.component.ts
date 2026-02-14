import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { IconName } from '../../../../core/icons/icon.component';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { MapComponent } from '../../../../shared/ui/map/map.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { BottomSheetComponent } from '../../../../shared/ui/bottom-sheet/bottom-sheet.component';
import { LoginFormComponent } from '../../../../shared/auth/ui/login-form/login-form.component';
import { JoinConfirmSheetComponent } from '../../overlays/join-confirm-sheet.component';
import { LeaveConfirmSheetComponent } from '../../overlays/leave-confirm-sheet.component';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { Event as EventModel, Participation } from '../../../../shared/types';

export type EventSheet = 'map' | 'participants' | 'auth' | 'joinConfirm' | 'leaveConfirm' | null;

@Component({
  selector: 'app-event',
  imports: [
    CommonModule, DatePipe, DecimalPipe, RouterLink,
    IconComponent, ButtonComponent,
    UserAvatarComponent, MapComponent, LoadingSpinnerComponent,
    BottomSheetComponent, LoginFormComponent,
    JoinConfirmSheetComponent, LeaveConfirmSheetComponent,
  ],
  templateUrl: './event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: '--hero-h: 300px' },
})
export class EventComponent implements OnInit, OnDestroy {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly event = signal<EventModel | null>(null);
  readonly participants = signal<Participation[]>([]);
  readonly isLoading = signal(true);
  readonly joining = signal(false);

  readonly activeSheet = signal<EventSheet>(null);

  readonly visibleAvatars = computed(() => this.participants().slice(0, 6));
  readonly remainingCount = computed(() => Math.max(0, this.participants().length - 6));

  readonly fullAddress = computed(() => {
    const e = this.event();
    if (!e) return '';
    // const parts = [e.address, e.city?.name].filter(Boolean);
    // return parts.join(', ');

    return e.address;
  });

  readonly startMonth = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleDateString('pl-PL', { month: 'short' }).toUpperCase();
  });

  readonly startDay = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).getDate().toString();
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

  readonly countdown = signal<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

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
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.isLoading.set(false);
        this.startCountdown(e.startsAt);
      },
      error: () => this.isLoading.set(false),
    });
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (p) => this.participants.set(p),
    });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
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

  get isParticipant(): boolean {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.participants().some(p => p.userId === userId && p.status === 'ACCEPTED');
  }

  get isOrganizer(): boolean {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.event()?.organizerId === userId;
  }

  openJoinSheet(): void {
    this.activeSheet.set(this.auth.isLoggedIn() ? 'joinConfirm' : 'auth');
  }

  confirmJoin(): void {
    this.activeSheet.set(null);
    this.joining.set(true);
    this.eventService.joinEvent(this.eventId).subscribe({
      next: (p) => {
        this.participants.update(prev => [...prev, p]);
        this.snackbar.success('Dołączono do wydarzenia!');
        this.joining.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się dołączyć');
        this.joining.set(false);
      },
    });
  }

  onAuthSuccess(): void {
    this.activeSheet.set('joinConfirm');
  }

  onFollow(): void {
    console.log('@TODO');
  }

  confirmLeave(): void {
    this.activeSheet.set(null);
    this.joining.set(true);
    this.eventService.leaveEvent(this.eventId).subscribe({
      next: () => {
        const userId = this.auth.currentUser()?.id;
        this.participants.update(prev => prev.filter(p => p.userId !== userId));
        this.snackbar.info('Wypisano z wydarzenia');
        this.joining.set(false);
      },
      error: () => {
        this.snackbar.error('Nie udało się wypisać');
        this.joining.set(false);
      },
    });
  }
}
