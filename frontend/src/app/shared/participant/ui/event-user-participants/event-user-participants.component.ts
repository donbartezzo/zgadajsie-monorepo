import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Participation } from '../../../types';
import { ParticipationStatus } from '../../../types/common.interface';
import { ParticipantGridItemComponent } from '../participant-grid/participant-grid-item.component';
import { ParticipantGridItemEmptyComponent } from '../participant-grid/participant-grid-item-empty.component';

type ParticipantFilter = 'all' | 'without-slot';

const WITHOUT_SLOT_STATUSES: ParticipationStatus[] = ['PENDING', 'WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-event-user-participants',
  imports: [ParticipantGridItemComponent, ParticipantGridItemEmptyComponent],
  templateUrl: './event-user-participants.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventUserParticipantsComponent {
  readonly participants = input<Participation[]>([]);
  readonly currentUserId = input<string | null>(null);

  readonly participantClicked = output<Participation>();
  readonly addNewParticipant = output<void>();

  readonly filter = signal<ParticipantFilter>('without-slot');

  readonly userParticipations = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.participants().filter(
      (p) => (!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUserId === uid),
    );
  });

  readonly withoutSlotCount = computed(
    () => this.userParticipations().filter((p) => WITHOUT_SLOT_STATUSES.includes(p.status)).length,
  );

  readonly filteredParticipations = computed(() => {
    const all = this.userParticipations();
    if (this.filter() === 'all') return all;
    return all.filter((p) => WITHOUT_SLOT_STATUSES.includes(p.status));
  });

  setFilter(f: ParticipantFilter): void {
    this.filter.set(f);
  }
}
