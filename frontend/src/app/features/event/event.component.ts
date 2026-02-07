import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { MapComponent } from '../../shared/ui/map/map.component';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';
import { EventService } from '../../core/services/event.service';
import { AuthService } from '../../core/auth/auth.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { Event as EventModel, Participation } from '../../shared/types';

@Component({
  selector: 'app-event',
  imports: [
    CommonModule, DatePipe, DecimalPipe, RouterLink,
    IconComponent, ButtonComponent, CardComponent,
    UserAvatarComponent, MapComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly event = signal<EventModel | null>(null);
  readonly participants = signal<Participation[]>([]);
  readonly isLoading = signal(true);
  readonly joining = signal(false);

  private get eventId(): string {
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
    this.eventService.getParticipants(this.eventId).subscribe({
      next: (p) => this.participants.set(p),
    });
  }

  get isParticipant(): boolean {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.participants().some(p => p.userId === userId && p.status === 'ACCEPTED');
  }

  get isOrganizer(): boolean {
    const userId = this.auth.currentUser()?.id;
    return !!userId && this.event()?.organizerId === userId;
  }

  onBack(): void {
    this.router.navigate(['/events']);
  }

  onJoin(): void {
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

  onLeave(): void {
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

  onShare(): void {
    if (navigator.share) {
      navigator.share({ title: this.event()?.title, url: window.location.href });
    }
  }
}
