import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../../ui/icon/icon.component';
import { Enrollment, EnrolleeManageItem, EventRoleConfig } from '../../../types';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Event, EnrollmentPhase } from '../../../types/event.interface';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalService } from '../../../ui/modal/modal.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import {
  EnrollmentSlotModalComponent,
  EnrollmentModalData,
} from '../enrollment-slot-modal/enrollment-slot-modal.component';
import { type SlotStatusConfig, SLOT_STATUS_CONFIG } from '../../slot-status-config';
import { EnrollmentItem, SlotItem, SlotGroup } from './enrollment-grid-item.component';
import { EnrollmentGridSectionComponent } from './enrollment-grid-section.component';

interface GridSection {
  type: 'assigned' | 'pending' | 'withdrawn';
  groups: SlotGroup[];
  config: SlotStatusConfig;
  count: number | null;
}

const SLOT_STATUSES = ['APPROVED', 'CONFIRMED'];
const PENDING_STATUSES = ['PENDING'];
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-enrollment-grid',
  imports: [IconComponent, EnrollmentGridSectionComponent],
  templateUrl: './enrollment-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridComponent {
  private readonly auth = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly statusConfig = SLOT_STATUS_CONFIG;

  readonly event = input.required<Event>();
  readonly participants = input<EnrollmentItem[]>([]);
  readonly slots = input<EventSlotInfo[]>([]);
  readonly readOnly = input(false);

  readonly refreshNeeded = output<void>();

  constructor() {
    this.modalService.refresh$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.refreshNeeded.emit();
    });
  }

  readonly enrollmentPhase = computed<EnrollmentPhase | null>(
    () => this.event().enrollmentPhase ?? null,
  );

  readonly maxSlots = computed(() => this.event().maxParticipants ?? 0);

  readonly roleConfig = computed<EventRoleConfig | null>(() => this.event().roleConfig ?? null);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

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

  readonly sections = computed<GridSection[]>(() => {
    const sections: GridSection[] = [];

    const groups = this.slotGroups();
    if (groups.length > 0) {
      sections.push({
        type: 'assigned',
        groups,
        config: this.statusConfig.assigned,
        count: null,
      });
    }

    const pending = this.pendingParticipants();
    if (pending.length > 0) {
      sections.push({
        type: 'pending',
        groups: [
          {
            role: null,
            items: this.pendingSlotItems(),
            occupiedCount: pending.length,
            totalSlots: 0,
          },
        ],
        config: this.statusConfig.pending,
        count: pending.length,
      });
    }

    const withdrawn = this.withdrawnParticipants();
    if (withdrawn.length > 0) {
      sections.push({
        type: 'withdrawn',
        groups: [
          {
            role: null,
            items: this.withdrawnSlotItems(),
            occupiedCount: withdrawn.length,
            totalSlots: 0,
          },
        ],
        config: this.statusConfig.withdrawn,
        count: withdrawn.length,
      });
    }

    return sections;
  });

  readonly slotGroups = computed<SlotGroup[]>(() => {
    const config = this.roleConfig();
    const allSlots = this.slots();
    const occupied = this.slotParticipants();

    if (config?.roles && config.roles.length > 1) {
      return config.roles.map((role) => {
        const roleParticipants = occupied.filter((p) => this.getEnrollmentRoleKey(p) === role.key);
        const items = this.buildSlotItems(allSlots, roleParticipants, role.slots || 0, role.key);
        return { role, items, occupiedCount: roleParticipants.length, totalSlots: role.slots || 0 };
      });
    }

    const max = this.maxSlots();
    const items = this.buildSlotItems(allSlots, occupied, max, null);
    return [{ role: null, items, occupiedCount: occupied.length, totalSlots: max }];
  });

  onSlotItemClick(item: SlotItem): void {
    if (this.readOnly()) {
      this.snackbar.info(
        'Zmiany w zakończonym wydarzeniu są zablokowane. Skontaktuj się z administracją serwisu.',
      );
      return;
    }

    const slot = item.participant
      ? this.findSlotForEnrollment(item.participant)
      : item.slotData.slot;
    const data: EnrollmentModalData = {
      participant: item.participant,
      slot,
      event: this.event(),
      allParticipants: this.participants(),
    };
    this.modalService.open(EnrollmentSlotModalComponent, { data });
  }

  private getEnrollmentRoleKey(p: EnrollmentItem): string | null | undefined {
    if ('slot' in p && (p as EnrolleeManageItem).slot?.roleKey) {
      return (p as EnrolleeManageItem).slot?.roleKey;
    }
    return (p as Enrollment).roleKey;
  }

  private buildSlotItems(
    allSlots: EventSlotInfo[],
    participants: EnrollmentItem[],
    totalSlots: number,
    roleKey: string | null,
  ): SlotItem[] {
    if (allSlots.length > 0) {
      const roleSlots = roleKey ? allSlots.filter((s) => s.roleKey === roleKey) : allSlots;
      const items = roleSlots.map((slot) => ({
        slotData: { slotId: slot.id, locked: slot.locked, slot },
        participant: participants.find((p) => slot.enrollmentId === p.id) ?? null,
      }));
      return items.sort((a, b) => {
        if (a.participant && !b.participant) return -1;
        if (!a.participant && b.participant) return 1;
        if (!a.participant && !b.participant) {
          if (a.slotData.locked && !b.slotData.locked) return 1;
          if (!a.slotData.locked && b.slotData.locked) return -1;
        }
        return 0;
      });
    }

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

  private findSlotForEnrollment(p: EnrollmentItem): EventSlotInfo | null {
    if ('slot' in p && (p as EnrolleeManageItem).slot) {
      return (p as EnrolleeManageItem).slot ?? null;
    }
    const enrollment = p as Enrollment;
    if (enrollment.slot) return enrollment.slot;
    return this.slots().find((s) => s.enrollmentId === p.id) ?? null;
  }
}
