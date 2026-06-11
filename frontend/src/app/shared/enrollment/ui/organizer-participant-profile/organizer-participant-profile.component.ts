import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { EventService } from '../../../../core/services/event.service';
import { ParticipantStatsComponent } from '../../../user/ui/participant-stats/participant-stats.component';

/**
 * Widok profilu uczestnika dla organizatora: dane ogólne (REAL: statystyki, linki,
 * „nowy"/„zaufany") + profil dyscypliny wydarzenia. Dla gościa — snapshot dyscyplinowy
 * w tym samym miejscu. Brak profilu → neutralne „Brak profilu dyscypliny".
 */
@Component({
  selector: 'app-organizer-participant-profile',
  imports: [TranslocoPipe, ParticipantStatsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organizer-participant-profile.component.html',
})
export class OrganizerParticipantProfileComponent {
  private readonly eventService = inject(EventService);

  readonly eventId = input.required<string>();
  readonly userId = input.required<string>();
  readonly disciplineSlug = input<string | null>(null);

  private readonly key = computed(() => ({ eventId: this.eventId(), userId: this.userId() }));

  readonly profile = toSignal(
    toObservable(this.key).pipe(
      switchMap(({ eventId, userId }) =>
        eventId && userId ? this.eventService.getParticipantProfile(eventId, userId) : of(null),
      ),
    ),
    { initialValue: null },
  );
}
