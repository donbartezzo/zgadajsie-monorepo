import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { Participation, ParticipantManageItem, EventRoleConfig, EventRole } from '../../../types';
import { SemanticColor } from '../../../types/colors';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Event, EnrollmentPhase } from '../../../types/event.interface';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalService } from '../../../ui/modal/modal.service';
import {
  ParticipantSlotModalComponent,
  ParticipantModalData,
} from '../participant-slot-modal/participant-slot-modal.component';

export type ParticipantItem = Participation | ParticipantManageItem;

export interface RoleGroup {
  role: EventRole;
  participants: ParticipantItem[];
  emptySlots: number;
}

// Participants who occupy a slot (have guaranteed place)
const SLOT_STATUSES = ['APPROVED', 'CONFIRMED'];
// Participants waiting for approval (no guaranteed place yet)
const PENDING_STATUSES = ['PENDING'];
// Participants who left or were removed
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-participant-slots-grid',
  imports: [UserAvatarComponent, IconComponent],
  templateUrl: './participant-slots-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantSlotsGridComponent {
  private readonly auth = inject(AuthService);
  private readonly modalService = inject(ModalService);

  readonly event = input.required<Event>();
  readonly participants = input<ParticipantItem[]>([]);
  readonly slots = input<EventSlotInfo[]>([]);

  readonly refreshNeeded = output<void>();

  constructor() {
    // Emit refreshNeeded whenever the modal signals a refresh
    this.modalService.refresh$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.refreshNeeded.emit();
    });
  }

  // ── Computed from event ──

  readonly enrollmentPhase = computed<EnrollmentPhase | null>(
    () => this.event().enrollmentPhase ?? null,
  );

  readonly maxSlots = computed(() => this.event().maxParticipants ?? 0);

  readonly roleConfig = computed<EventRoleConfig | null>(
    () => this.event().roleConfig ?? null,
  );

  readonly isPaidEvent = computed(() => (this.event().costPerPerson ?? 0) > 0);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  // ── Derived computed ──

  readonly isPreEnrollment = computed(() => this.enrollmentPhase() === 'PRE_ENROLLMENT');

  readonly hasRoles = computed(() => {
    const config = this.roleConfig();
    return !!(config?.roles && config.roles.length > 1);
  });

  readonly roleGroups = computed<RoleGroup[]>(() => {
    const config = this.roleConfig();
    if (!config?.roles || config.roles.length <= 1) return [];

    const slotParticipants = this.slotParticipants();

    return config.roles.map((role) => {
      const roleParticipants = slotParticipants.filter((p) => {
        const pRoleKey =
          'slot' in p && (p as ParticipantManageItem).slot?.roleKey
            ? (p as ParticipantManageItem).slot!.roleKey
            : (p as Participation).roleKey;
        return pRoleKey === role.key;
      });
      return {
        role,
        participants: roleParticipants,
        emptySlots: Math.max(0, role.slots - roleParticipants.length),
      };
    });
  });

  readonly slotParticipants = computed(() =>
    this.participants().filter((p) => SLOT_STATUSES.includes(p.status)),
  );

  readonly pendingParticipants = computed(() =>
    this.participants().filter((p) => PENDING_STATUSES.includes(p.status)),
  );

  readonly withdrawnParticipants = computed(() =>
    this.participants().filter((p) => WITHDRAWN_STATUSES.includes(p.status)),
  );

  readonly totalCount = computed(() => this.participants().length);

  readonly emptySlotCount = computed(() => {
    const max = this.maxSlots();
    const occupied = this.slotParticipants().length;
    return Math.max(0, max - occupied);
  });

  readonly emptySlotItems = computed(() => {
    const allSlots = this.slots();
    if (allSlots.length > 0) {
      const emptySlots = allSlots.filter((s) => !s.participationId);
      const count = this.emptySlotCount();
      return emptySlots.slice(0, count).map((s) => ({ slotId: s.id, locked: s.locked, slot: s }));
    }
    const count = this.emptySlotCount();
    return Array.from({ length: count }, () => ({
      slotId: undefined as string | undefined,
      locked: false,
      slot: null as EventSlotInfo | null,
    }));
  });

  getEmptySlotItemsForRole(
    roleKey: string,
  ): { slotId: string | undefined; locked: boolean; slot: EventSlotInfo | null }[] {
    const allSlots = this.slots();
    if (allSlots.length > 0) {
      const emptyForRole = allSlots.filter((s) => !s.participationId && s.roleKey === roleKey);
      const groups = this.roleGroups();
      const group = groups.find((g) => g.role.key === roleKey);
      if (!group) return [];
      return emptyForRole
        .slice(0, group.emptySlots)
        .map((s) => ({ slotId: s.id, locked: s.locked, slot: s }));
    }
    const groups = this.roleGroups();
    const group = groups.find((g) => g.role.key === roleKey);
    if (!group) return [];
    return Array.from({ length: group.emptySlots }, () => ({
      slotId: undefined as string | undefined,
      locked: false,
      slot: null,
    }));
  }

  onParticipantClick(p: ParticipantItem): void {
    const slot = this.findSlotForParticipant(p);
    const data: ParticipantModalData = { participant: p, slot, event: this.event() };
    this.modalService.open(ParticipantSlotModalComponent, { data });
  }

  onSlotClick(slotInfo: EventSlotInfo | null): void {
    const data: ParticipantModalData = { participant: null, slot: slotInfo, event: this.event() };
    this.modalService.open(ParticipantSlotModalComponent, { data });
  }

  private findSlotForParticipant(p: ParticipantItem): EventSlotInfo | null {
    // ParticipantManageItem has slot directly
    if ('slot' in p && (p as ParticipantManageItem).slot) {
      return (p as ParticipantManageItem).slot ?? null;
    }
    // Participation has slot too
    const participation = p as Participation;
    if (participation.slot) return participation.slot;
    // Look up in slots input by participationId
    return this.slots().find((s) => s.participationId === p.id) ?? null;
  }

  getAvatarUrl(p: ParticipantItem): string | null {
    return p.user?.avatarUrl ?? null;
  }

  getDisplayName(p: ParticipantItem): string {
    return p.user?.displayName ?? 'Uczestnik';
  }

  needsPayment(p: ParticipantItem): boolean {
    if ('payment' in p) {
      const pm = p as ParticipantManageItem;
      return pm.payment === null && p.status === 'APPROVED';
    }
    if (this.isPaidEvent()) {
      return (p as Participation).status === 'APPROVED';
    }
    return false;
  }

  getStatusIndicator(p: ParticipantItem): SemanticColor | null {
    if (p.status === 'CONFIRMED') return 'success';
    return null;
  }

  isCurrentUser(p: ParticipantItem): boolean {
    return p.userId === this.currentUserId();
  }

  isCurrentUserGuest(p: ParticipantItem): boolean {
    if (!p.isGuest || !this.currentUserId()) return false;
    return p.addedByUserId === this.currentUserId();
  }

  isBanned(p: ParticipantItem): boolean {
    return (p as Participation).waitingReason === 'BANNED';
  }
}
