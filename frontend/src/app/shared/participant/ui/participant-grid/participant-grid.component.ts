import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '../../../ui/icon/icon.component';
import { Participation, ParticipantManageItem, EventRoleConfig } from '../../../types';
import { DisciplineRole } from '@zgadajsie/shared';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Event, EnrollmentPhase } from '../../../types/event.interface';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalService } from '../../../ui/modal/modal.service';
import {
  ParticipantSlotModalComponent,
  ParticipantModalData,
} from '../participant-slot-modal/participant-slot-modal.component';
import { SLOT_STATUS_CONFIG } from '../../slot-status-config';
import {
  ParticipantGridItemComponent,
  SlotItem,
  ParticipantItem,
} from './participant-grid-item.component';
import { ParticipantGridItemEmptyComponent } from './participant-grid-item-empty.component';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';

interface SlotGroup {
  role: DisciplineRole | null;
  items: SlotItem[];
  occupiedCount: number;
  totalSlots: number;
}

// Participants who occupy a slot (have guaranteed place)
const SLOT_STATUSES = ['APPROVED', 'CONFIRMED'];
// Participants waiting for approval (no guaranteed place yet)
const PENDING_STATUSES = ['PENDING'];
// Participants who left or were removed
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-participant-grid',
  imports: [
    IconComponent,
    TranslocoPipe,
    CapacityProgressComponent,
    ParticipantGridItemComponent,
    ParticipantGridItemEmptyComponent,
  ],
  templateUrl: './participant-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantGridComponent {
  private readonly auth = inject(AuthService);
  private readonly modalService = inject(ModalService);

  protected readonly statusConfig = SLOT_STATUS_CONFIG;

  readonly event = input.required<Event>();
  readonly participants = input<ParticipantItem[]>([]);
  readonly slots = input<EventSlotInfo[]>([]);

  readonly refreshNeeded = output<void>();

  constructor() {
    this.modalService.refresh$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.refreshNeeded.emit();
    });
  }

  // ── Computed from event ──

  readonly enrollmentPhase = computed<EnrollmentPhase | null>(
    () => this.event().enrollmentPhase ?? null,
  );

  readonly maxSlots = computed(() => this.event().maxParticipants ?? 0);

  readonly roleConfig = computed<EventRoleConfig | null>(() => this.event().roleConfig ?? null);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  // ── Derived computed ──

  readonly isPreEnrollment = computed(() => this.enrollmentPhase() === 'PRE_ENROLLMENT');

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

  readonly pendingSlotItems = computed<SlotItem[]>(() =>
    this.pendingParticipants().map((p) => ({
      slotData: { slotId: undefined, locked: false, slot: null },
      participant: p,
    })),
  );

  readonly withdrawnSlotItems = computed<SlotItem[]>(() =>
    this.withdrawnParticipants().map((p) => ({
      slotData: { slotId: undefined, locked: false, slot: null },
      participant: p,
    })),
  );

  readonly slotGroups = computed<SlotGroup[]>(() => {
    const config = this.roleConfig();
    const allSlots = this.slots();
    const occupied = this.slotParticipants();

    if (config?.roles && config.roles.length > 1) {
      return config.roles.map((role) => {
        const roleParticipants = occupied.filter((p) => this.getParticipantRoleKey(p) === role.key);
        const items = this.buildSlotItems(allSlots, roleParticipants, role.slots || 0, role.key);
        return { role, items, occupiedCount: roleParticipants.length, totalSlots: role.slots || 0 };
      });
    }

    const max = this.maxSlots();
    const items = this.buildSlotItems(allSlots, occupied, max, null);
    return [{ role: null, items, occupiedCount: occupied.length, totalSlots: max }];
  });

  onSlotItemClick(item: SlotItem): void {
    const slot = item.participant
      ? this.findSlotForParticipant(item.participant)
      : item.slotData.slot;
    const data: ParticipantModalData = {
      participant: item.participant,
      slot,
      event: this.event(),
    };
    this.modalService.open(ParticipantSlotModalComponent, { data });
  }

  private getParticipantRoleKey(p: ParticipantItem): string | null | undefined {
    if ('slot' in p && (p as ParticipantManageItem).slot?.roleKey) {
      return (p as ParticipantManageItem).slot?.roleKey;
    }
    return (p as Participation).roleKey;
  }

  private buildSlotItems(
    allSlots: EventSlotInfo[],
    participants: ParticipantItem[],
    totalSlots: number,
    roleKey: string | null,
  ): SlotItem[] {
    if (allSlots.length > 0) {
      const roleSlots = roleKey ? allSlots.filter((s) => s.roleKey === roleKey) : allSlots;
      const items = roleSlots.map((slot) => ({
        slotData: { slotId: slot.id, locked: slot.locked, slot },
        participant: participants.find((p) => slot.participationId === p.id) ?? null,
      }));
      // Sort: occupied slots first, then empty slots
      return items.sort((a, b) => {
        if (a.participant && !b.participant) return -1;
        if (!a.participant && b.participant) return 1;
        return 0;
      });
    }

    // Fallback: no real slot data — synthesize from participants + empty placeholders
    const items: SlotItem[] = participants.map((p) => ({
      slotData: { slotId: undefined, locked: false, slot: null },
      participant: p,
    }));
    const emptyCount = Math.max(0, totalSlots - participants.length);
    for (let i = 0; i < emptyCount; i++) {
      items.push({ slotData: { slotId: undefined, locked: false, slot: null }, participant: null });
    }
    return items;
  }

  private findSlotForParticipant(p: ParticipantItem): EventSlotInfo | null {
    if ('slot' in p && (p as ParticipantManageItem).slot) {
      return (p as ParticipantManageItem).slot ?? null;
    }
    const participation = p as Participation;
    if (participation.slot) return participation.slot;
    return this.slots().find((s) => s.participationId === p.id) ?? null;
  }
}
