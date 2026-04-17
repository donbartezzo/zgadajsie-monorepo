import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Participation } from '../../../types';
import { ParticipationStatus } from '../../../types/common.interface';
import { EnrollmentGridItemComponent } from '../enrollment-grid/enrollment-grid-item.component';
import { EnrollmentGridItemEmptyComponent } from '../enrollment-grid/enrollment-grid-item-empty.component';

type ParticipantFilter = 'all' | 'without-slot' | 'role';

const WITHOUT_SLOT_STATUSES: ParticipationStatus[] = ['PENDING', 'WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-event-user-participants',
  imports: [EnrollmentGridItemComponent, EnrollmentGridItemEmptyComponent, TranslocoPipe],
  templateUrl: './event-user-participants.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventUserParticipantsComponent {
  readonly participants = input<Participation[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly preselectedRoleKey = input<string | null>(null);

  readonly participantClicked = output<Participation>();
  readonly addNewParticipant = output<void>();

  readonly filter = signal<ParticipantFilter>('without-slot');

  private hasInitializedRoleFilter = false;

  constructor() {
    // Set default filter to 'role' when role is preselected (only on first initialization)
    effect(() => {
      const roleKey = this.preselectedRoleKey();
      if (roleKey && !this.hasInitializedRoleFilter) {
        this.filter.set('role');
        this.hasInitializedRoleFilter = true;
      }
    });
  }

  readonly userParticipations = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.participants().filter(
      (p) => (!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUser?.id === uid),
    );
  });

  readonly withoutSlotCount = computed(
    () => this.userParticipations().filter((p) => WITHOUT_SLOT_STATUSES.includes(p.status)).length,
  );

  readonly roleCount = computed(() => {
    const roleKey = this.preselectedRoleKey();
    if (!roleKey) return 0;
    return this.userParticipations().filter((p) => {
      const participantRoleKey = p.slot?.roleKey ?? p.roleKey ?? null;
      return participantRoleKey === roleKey;
    }).length;
  });

  readonly filteredParticipations = computed(() => {
    const all = this.userParticipations();
    const filter = this.filter();

    if (filter === 'all') return all;
    if (filter === 'without-slot')
      return all.filter((p) => WITHOUT_SLOT_STATUSES.includes(p.status));

    // filter === 'role'
    const roleKey = this.preselectedRoleKey();
    if (!roleKey) return all;
    return all.filter((p) => {
      const participantRoleKey = p.slot?.roleKey ?? p.roleKey ?? null;
      return participantRoleKey === roleKey;
    });
  });

  setFilter(f: ParticipantFilter): void {
    this.filter.set(f);
  }
}
