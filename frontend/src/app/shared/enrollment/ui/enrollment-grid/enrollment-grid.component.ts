import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { Enrollment, EnrolleeManageItem, EventRoleConfig } from '../../../types';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Event } from '../../../types/event.interface';
import {
  getLotteryThreshold,
  isPreEnrollment as isPreEnrollmentFn,
} from '../../../utils/event-time-status.util';
import { getEventCountdown, EventCountdown, EventStatus, nowInZone } from '@zgadajsie/shared';
import {
  EnrollmentInfoBannerComponent,
  EnrollmentInfoBannerVariant,
} from '../enrollment-info-banner/enrollment-info-banner.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalService } from '../../../ui/modal/modal.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import {
  EnrollmentSlotModalComponent,
  EnrollmentModalData,
} from '../enrollment-slot-modal/enrollment-slot-modal.component';
import { type SlotStatusConfig, SLOT_STATUS_CONFIG } from '../../slot-status-config';
import {
  EnrollmentItem,
  SlotItem,
  SlotGroup,
} from './enrollment-grid-item/enrollment-grid-item.component';
import { EnrollmentGridSectionComponent } from './enrollment-grid-section.component';

interface GridSection {
  type: 'assigned' | 'pending' | 'withdrawn';
  groups: SlotGroup[];
  config: SlotStatusConfig;
  count: number;
}

const SLOT_STATUSES = ['APPROVED', 'CONFIRMED'];
const PENDING_STATUSES = ['PENDING'];
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-enrollment-grid',
  imports: [
    FormsModule,
    BadgeComponent,
    EnrollmentGridSectionComponent,
    EnrollmentInfoBannerComponent,
  ],
  templateUrl: './enrollment-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly modalService = inject(ModalService);
  private readonly snackbar = inject(SnackbarService);
  private readonly ngZone = inject(NgZone);
  private lotteryCountdownInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly statusConfig = SLOT_STATUS_CONFIG;

  readonly event = input.required<Event>();
  readonly participants = input<EnrollmentItem[]>([]);
  readonly slots = input<EventSlotInfo[]>([]);
  readonly readOnly = input(false);

  readonly highlightOwn = signal(true);

  readonly refreshNeeded = output<void>();

  constructor() {
    this.modalService.refresh$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.refreshNeeded.emit();
    });

    effect(() => {
      if (this.isPreEnrollment()) {
        this.startLotteryCountdown(this.event().startsAt);
      } else {
        this.stopLotteryCountdown();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopLotteryCountdown();
  }

  private startLotteryCountdown(startsAt: string): void {
    if (this.lotteryCountdownInterval) return;
    const lotteryThreshold = getLotteryThreshold(startsAt);
    const lotteryIso = lotteryThreshold.toISOString();
    const update = () => {
      this.lotteryCountdown.set(getEventCountdown(lotteryIso, startsAt, Infinity));
      if (nowInZone().toJSDate() >= lotteryThreshold && this.lotteryCountdownInterval) {
        clearInterval(this.lotteryCountdownInterval);
        this.lotteryCountdownInterval = null;
      }
    };

    this.ngZone.runOutsideAngular(() => {
      update();
      this.lotteryCountdownInterval = setInterval(() => {
        this.ngZone.run(update);
      }, 1000);
    });
  }

  private stopLotteryCountdown(): void {
    if (this.lotteryCountdownInterval) {
      clearInterval(this.lotteryCountdownInterval);
      this.lotteryCountdownInterval = null;
    }
    this.lotteryCountdown.set(null);
  }

  readonly maxSlots = computed(() => this.event().maxParticipants ?? 0);

  readonly roleConfig = computed<EventRoleConfig | null>(() => this.event().roleConfig ?? null);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly ownEnrollmentCount = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return 0;
    return this.participants().reduce((count, p) => {
      // Bezpośredni zapis użytkownika
      if (p.userId === uid) return count + 1;
      // Gość dodany przez użytkownika
      if (p.isGuest) {
        const addedById = 'addedByUserId' in p ? p.addedByUserId : p.addedByUser?.id;
        if (addedById === uid) return count + 1;
      }
      return count;
    }, 0);
  });

  readonly isPreEnrollment = computed(() => {
    const e = this.event();
    return isPreEnrollmentFn(e.startsAt, e.lotteryExecutedAt, e.status);
  });

  readonly isCancelled = computed(() => this.event().status === EventStatus.CANCELLED);

  readonly bannerVariant = computed<EnrollmentInfoBannerVariant | null>(() => {
    if (this.isCancelled()) return 'cancelled';
    if (this.isPreEnrollment()) return 'pre-enrollment';
    return null;
  });

  readonly lotteryCountdown = signal<EventCountdown | null>(null);

  readonly slotParticipants = computed(() => {
    if (this.isPreEnrollment() || this.isCancelled()) return [];
    return this.participants().filter((p) => SLOT_STATUSES.includes(p.status));
  });

  readonly pendingParticipants = computed(() => {
    // Wydarzenie odwołane: po cancel() wszyscy z wantsIn=true zostają wypisani z withdrawnBy=ORGANIZER,
    // więc nie powinno być żadnych PENDING. Defensywnie wymuszamy pustą sekcję.
    if (this.isCancelled()) return [];

    // In pre-enrollment all active participants (regardless of derived status) go to "Oczekujący".
    // Organizer-pre-assigned slots must not reveal themselves until the lottery executes, so we
    // clone each participant with status='PENDING' and drop slot/payment hints from the view.
    if (this.isPreEnrollment()) {
      const activeStatuses = [...SLOT_STATUSES, ...PENDING_STATUSES];
      return this.participants()
        .filter((p) => activeStatuses.includes(p.status))
        .map((p) => ({ ...p, status: 'PENDING' as const, slot: null, payment: null }));
    }
    return this.participants().filter((p) => PENDING_STATUSES.includes(p.status));
  });

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
        count: this.slotParticipants().length,
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
    if (this.isPreEnrollment() || this.isCancelled()) return [];

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
      const sorted = items.sort((a, b) => {
        if (a.participant && !b.participant) return -1;
        if (!a.participant && b.participant) return 1;
        if (!a.participant && !b.participant) {
          if (a.slotData.locked && !b.slotData.locked) return 1;
          if (!a.slotData.locked && b.slotData.locked) return -1;
        }
        return 0;
      });

      // Defensywnie ograniczamy do liczby slotów z konfiguracji, ale nigdy nie ukrywamy
      // zajętego slotu (gdyby dane w bazie odbiegały od konfiguracji ról).
      if (totalSlots > 0) {
        const occupiedCount = sorted.filter((i) => i.participant).length;
        const cap = Math.max(totalSlots, occupiedCount);
        return sorted.slice(0, cap);
      }
      return sorted;
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
