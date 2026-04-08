import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { Participation, ParticipantManageItem } from '../../../types';
import { SemanticColor } from '../../../types/colors';
import { SlotDisplayStatus } from '../../slot-status-config';

type ParticipantItem = Participation | ParticipantManageItem;

@Component({
  selector: 'app-participant-card',
  imports: [UserAvatarComponent, IconComponent],
  templateUrl: './participant-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantCardComponent {
  readonly participant = input.required<ParticipantItem>();
  readonly currentUserId = input<string | null>(null);
  readonly isPaidEvent = input(false);

  readonly clicked = output<void>();

  readonly displayName = computed(() => this.participant().user?.displayName ?? 'Uczestnik');
  readonly avatarUrl = computed(() => this.participant().user?.avatarUrl ?? null);

  readonly slotDisplayStatus = computed<SlotDisplayStatus>(() => {
    const s = this.participant().status;
    if (s === 'PENDING') return 'pending';
    if (s === 'WITHDRAWN' || s === 'REJECTED') return 'withdrawn';
    return 'participant';
  });

  readonly isCurrentUser = computed(() => this.participant().userId === this.currentUserId());

  readonly isCurrentUserGuest = computed(() => {
    const p = this.participant();
    if (!p.isGuest) return false;
    return p.addedByUserId === this.currentUserId();
  });

  readonly isBanned = computed(
    () => (this.participant() as Participation).waitingReason === 'BANNED',
  );

  readonly needsPayment = computed(
    () => this.participant().payment === null && this.participant().status === 'APPROVED',
  );

  readonly showPending = computed(
    () => this.participant().status === 'PENDING' && !this.isBanned(),
  );

  readonly avatarStatus = computed<SemanticColor | null>(() => {
    const s = this.participant().status;
    if (s === 'CONFIRMED') return 'success';
    if (s === 'REJECTED') return 'danger';
    return null;
  });

  readonly buttonClass = computed(() => {
    const base =
      'flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors' +
      ' hover:bg-neutral-50 focus:outline-hidden';
    const status = this.slotDisplayStatus();
    if (this.isCurrentUser()) return `${base} ring-2 ring-primary-400 bg-primary-50`;
    if (this.isCurrentUserGuest()) {
      if (status === 'pending') return `${base} ring-2 ring-secondary-300 bg-secondary-50 opacity-80`;
      return `${base} ring-2 ring-secondary-300 bg-secondary-50`;
    }
    if (status === 'pending') return `${base} focus:ring-2 focus:ring-warning-200 opacity-80`;
    if (status === 'withdrawn') return `${base} focus:ring-2 focus:ring-neutral-200 opacity-50`;
    return `${base} focus:ring-2 focus:ring-primary-200`;
  });

  readonly nameClass = computed(() => {
    const status = this.slotDisplayStatus();
    if (status === 'withdrawn') return 'text-neutral-400';
    if (status === 'pending') return this.isBanned() ? 'text-danger-500' : 'text-warning-600';
    return 'text-neutral-700';
  });
}
