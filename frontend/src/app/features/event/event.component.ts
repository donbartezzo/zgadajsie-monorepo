import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../core/icons/icon.component';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService, EventDetail } from './event.service';
import { toSignal } from '@angular/core/rxjs-interop';

// @theme: page-events-detailed-3.html
@Component({
  selector: 'app-event',
  imports: [CommonModule, IconComponent],
  templateUrl: './event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);

  private readonly eventId = this.route.snapshot.paramMap.get('id')!;

  private readonly event$ = this.eventService.getEvent(this.eventId);
  readonly event = toSignal<EventDetail | null>(this.event$, { initialValue: null });

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.event$.subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.error.set('Failed to load event');
        this.isLoading.set(false);
      },
    });
  }

  onBackClick(): void {
    this.router.navigate(['/events']);
  }

  onJoinClick(): void {
    this.eventService.joinEvent(this.eventId).subscribe({
      next: () => {
        // TODO: show success feedback
      },
      error: () => {
        // TODO: show error feedback
      },
    });
  }

  onFollowClick(): void {
    this.eventService.followEvent(this.eventId).subscribe({
      next: () => {
        // TODO: toggle followed state / feedback
      },
      error: () => {
        // TODO: show error feedback
      },
    });
  }
}
