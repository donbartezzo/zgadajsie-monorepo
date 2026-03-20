import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { IconComponent } from '../../../core/icons/icon.component';
import { Participation, ParticipantManageItem, EventRoleConfig, EventRole } from '../../types';
import { SemanticColor } from '../../types/colors';
import { EnrollmentPhase } from '../../types/event.interface';

export type SlotMode = 'public' | 'organizer';

export type ParticipantItem = Participation | ParticipantManageItem;

export interface RoleGroup {
  role: EventRole;
  participants: ParticipantItem[];
  emptySlots: number;
}

// Participants who occupy a slot (have guaranteed place)
// APPROVED = has slot, not confirmed yet (pending payment for paid events)
// CONFIRMED = has slot, confirmed (paid or free event)
const SLOT_STATUSES = ['APPROVED', 'CONFIRMED'];
// Participants waiting for approval (no guaranteed place yet)
const PENDING_STATUSES = ['PENDING'];
// Participants who left or were removed
const WITHDRAWN_STATUSES = ['WITHDRAWN', 'REJECTED'];

@Component({
  selector: 'app-participant-slots-grid',
  imports: [UserAvatarComponent, IconComponent],
  template: `
    @if (isPreEnrollment() && mode() === 'public') {
    <div
      class="flex flex-col items-center justify-center rounded-xl border border-info-200 bg-info-50 p-6 text-center"
    >
      <app-icon name="users" size="lg" class="text-info-400 mb-3"></app-icon>
      <h3 class="text-sm font-semibold text-info-700">Trwają wstępne zapisy</h3>
      <p class="mt-1 text-xs text-neutral-500">
        Lista uczestników zostanie ujawniona po zakończeniu losowania.
      </p>
      @if (totalCount() > 0) {
      <p class="mt-2 text-xs font-medium text-info-600">Zgłoszonych: {{ totalCount() }}</p>
      }
    </div>
    } @else { @if (hasRoles()) {
    <!-- ROLE-GROUPED VIEW -->
    <div class="space-y-6">
      @for (group of roleGroups(); track group.role.key) {
      <div>
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-semibold text-neutral-700">{{ group.role.title }}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
            {{ group.participants.length }}/{{ group.role.slots }}
          </span>
          @if (group.role.isDefault) {
          <span class="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-600"
            >domyślna</span
          >
          }
        </div>
        <div class="flex flex-wrap gap-3 justify-center">
          @for (p of group.participants; track p.id) {
          <button
            type="button"
            [attr.data-user-id]="p.userId"
            [class]="
              'flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none ' +
              (isCurrentUser(p)
                ? 'ring-2 ring-primary-400 bg-primary-50'
                : isCurrentUserGuest(p)
                ? 'ring-2 ring-secondary-300 bg-secondary-50'
                : 'focus:ring-2 focus:ring-primary-200')
            "
            (click)="onParticipantClick(p)"
          >
            <app-user-avatar
              [avatarUrl]="getAvatarUrl(p)"
              [displayName]="getDisplayName(p)"
              size="lg"
              [showPaymentWarning]="needsPayment(p)"
              [status]="getStatusIndicator(p)"
            />
            <span
              class="text-[11px] text-neutral-700 text-center leading-tight mt-1 w-full line-clamp-2 min-h-[2.5em]"
            >
              {{ getDisplayName(p) }}
            </span>
          </button>
          } @if (group.emptySlots > 0) { @for (i of getEmptySlotIndices(group.emptySlots); track i)
          {
          <button
            type="button"
            class="flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            (click)="emptySlotClicked.emit()"
          >
            <div
              class="w-14 h-14 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center bg-neutral-50"
            >
              <app-icon name="plus" size="sm" class="text-neutral-300"></app-icon>
            </div>
            <span class="text-[11px] text-neutral-400 text-center leading-tight mt-1 min-h-[2.5em]"
              >Wolne</span
            >
          </button>
          } }
        </div>
      </div>
      }
    </div>

    <!-- Summary row for roles -->
    <div class="mt-4 flex items-center justify-between text-xs text-neutral-500">
      <span> {{ slotParticipants().length }}/{{ maxSlots() }} miejsc zajętych </span>
      @if (emptySlotCount() > 0) {
      <span class="text-primary-500">{{ emptySlotCount() }} wolnych</span>
      }
    </div>
    } @else {
    <!-- STANDARD VIEW (no roles) -->
    <div class="flex flex-wrap gap-3 justify-center">
      <!-- Occupied slots -->
      @for (p of slotParticipants(); track p.id) {
      <button
        type="button"
        [attr.data-user-id]="p.userId"
        [class]="
          'flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none ' +
          (isCurrentUser(p)
            ? 'ring-2 ring-primary-400 bg-primary-50'
            : isCurrentUserGuest(p)
            ? 'ring-2 ring-secondary-300 bg-secondary-50'
            : 'focus:ring-2 focus:ring-primary-200')
        "
        (click)="onParticipantClick(p)"
      >
        <app-user-avatar
          [avatarUrl]="getAvatarUrl(p)"
          [displayName]="getDisplayName(p)"
          size="lg"
          [showPaymentWarning]="needsPayment(p)"
          [status]="getStatusIndicator(p)"
        />
        <span
          class="text-[11px] text-neutral-700 text-center leading-tight mt-1 w-full line-clamp-2 min-h-[2.5em]"
        >
          {{ getDisplayName(p) }}
        </span>
      </button>
      }

      <!-- Empty slots (only show when there are any) -->
      @if (emptySlotCount() > 0) { @for (i of emptySlotIndices(); track i) {
      <button
        type="button"
        class="flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        (click)="emptySlotClicked.emit()"
      >
        <div
          class="w-14 h-14 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center bg-neutral-50"
        >
          <app-icon name="plus" size="sm" class="text-neutral-300"></app-icon>
        </div>
        <span class="text-[11px] text-neutral-400 text-center leading-tight mt-1 min-h-[2.5em]"
          >Wolne</span
        >
      </button>
      } }
    </div>

    <!-- Summary row -->
    <div class="mt-4 flex items-center justify-between text-xs text-neutral-500">
      <span> {{ slotParticipants().length }}/{{ maxSlots() }} miejsc zajętych </span>
      @if (emptySlotCount() > 0) {
      <span class="text-primary-500">{{ emptySlotCount() }} wolnych</span>
      }
    </div>
    }

    <!-- SECTION 2: PENDING (outside slots) -->
    @if (pendingParticipants().length > 0) {
    <div class="mt-6 pt-4 border-t border-neutral-100">
      <h4 class="text-xs font-semibold text-warning-600 mb-3 flex items-center gap-1">
        <app-icon name="clock" size="xs" />
        Oczekujący ({{ pendingParticipants().length }})
      </h4>
      <div class="flex flex-wrap gap-3 justify-center">
        @for (p of pendingParticipants(); track p.id) {
        <button
          type="button"
          [attr.data-user-id]="p.userId"
          [class]="
            'flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none ' +
            (isCurrentUser(p)
              ? 'ring-2 ring-primary-400 bg-primary-50'
              : isCurrentUserGuest(p)
              ? 'ring-2 ring-secondary-300 bg-secondary-50 opacity-80'
              : 'focus:ring-2 focus:ring-warning-200 opacity-80')
          "
          (click)="onParticipantClick(p)"
        >
          <app-user-avatar
            [avatarUrl]="getAvatarUrl(p)"
            [displayName]="getDisplayName(p)"
            size="lg"
            [showPending]="true"
          />
          <span
            class="text-[11px] text-warning-600 text-center leading-tight mt-1 w-full line-clamp-2 min-h-[2.5em]"
          >
            {{ getDisplayName(p) }}
          </span>
        </button>
        }
      </div>
    </div>
    }

    <!-- SECTION 3: WITHDRAWN (removed/left) -->
    @if (withdrawnParticipants().length > 0) {
    <div class="mt-6 pt-4 border-t border-neutral-100">
      <h4 class="text-xs font-semibold text-neutral-400 mb-3 flex items-center gap-1">
        <app-icon name="user-x" size="xs" />
        Wypisani ({{ withdrawnParticipants().length }})
      </h4>
      <div class="flex flex-wrap gap-3 justify-center">
        @for (p of withdrawnParticipants(); track p.id) {
        <button
          type="button"
          [attr.data-user-id]="p.userId"
          [class]="
            'flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none ' +
            (isCurrentUser(p)
              ? 'ring-2 ring-primary-400 bg-primary-50'
              : 'focus:ring-2 focus:ring-neutral-200 opacity-50')
          "
          (click)="onParticipantClick(p)"
        >
          <app-user-avatar
            [avatarUrl]="getAvatarUrl(p)"
            [displayName]="getDisplayName(p)"
            size="lg"
            [status]="p.status === 'REJECTED' ? 'danger' : null"
          />
          <span
            class="text-[11px] text-neutral-400 text-center leading-tight mt-1 w-full line-clamp-2 min-h-[2.5em]"
          >
            {{ getDisplayName(p) }}
          </span>
        </button>
        }
      </div>
    </div>
    } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantSlotsGridComponent {
  readonly participants = input<ParticipantItem[]>([]);
  readonly maxSlots = input(0);
  readonly mode = input<SlotMode>('public');
  readonly enrollmentPhase = input<EnrollmentPhase | null>(null);
  readonly isPaidEvent = input(false);
  readonly currentUserId = input<string | null>(null);
  readonly roleConfig = input<EventRoleConfig | null>(null);

  readonly participantClicked = output<ParticipantItem>();
  readonly emptySlotClicked = output<void>();

  readonly isPreEnrollment = computed(() => this.enrollmentPhase() === 'PRE_ENROLLMENT');
  readonly hasRoles = computed(() => {
    const config = this.roleConfig();
    return config?.roles && config.roles.length > 1;
  });

  readonly shouldHideEmptySlots = computed(() => {
    // Hide empty slots when maxSlots equals occupied slots (filtering mode)
    return this.maxSlots() === this.slotParticipants().length;
  });

  readonly roleGroups = computed<RoleGroup[]>(() => {
    const config = this.roleConfig();
    if (!config?.roles || config.roles.length <= 1) return [];

    const slotParticipants = this.slotParticipants();
    const hideEmpty = this.shouldHideEmptySlots();

    return config.roles.map((role) => {
      const roleParticipants = slotParticipants.filter((p) => {
        const pRoleKey =
          'slot' in p && p.slot?.roleKey ? p.slot.roleKey : (p as Participation).roleKey;
        return pRoleKey === role.key;
      });
      return {
        role,
        participants: roleParticipants,
        emptySlots: hideEmpty ? 0 : Math.max(0, role.slots - roleParticipants.length),
      };
    });
  });

  // Section 1: Participants who occupy slots (APPROVED, CONFIRMED, PENDING_PAYMENT)
  readonly slotParticipants = computed(() =>
    this.participants().filter((p) => SLOT_STATUSES.includes(p.status)),
  );

  // Section 2: Participants waiting for approval (PENDING, APPLIED)
  readonly pendingParticipants = computed(() =>
    this.participants().filter((p) => PENDING_STATUSES.includes(p.status)),
  );

  // Section 3: Participants who left or were removed (WITHDRAWN, REJECTED)
  readonly withdrawnParticipants = computed(() =>
    this.participants().filter((p) => WITHDRAWN_STATUSES.includes(p.status)),
  );

  readonly totalCount = computed(() => this.participants().length);

  readonly emptySlotCount = computed(() => {
    const max = this.maxSlots();
    const occupied = this.slotParticipants().length;
    return Math.max(0, max - occupied);
  });

  readonly emptySlotIndices = computed(() => {
    const count = this.emptySlotCount();
    return Array.from({ length: count }, (_, i) => i);
  });

  getEmptySlotIndices(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  getAvatarUrl(p: ParticipantItem): string | null {
    return p.user?.avatarUrl ?? null;
  }

  getDisplayName(p: ParticipantItem): string {
    return p.user?.displayName ?? 'Uczestnik';
  }

  needsPayment(p: ParticipantItem): boolean {
    // For organizer view with ParticipantManageItem - check payment field
    if ('payment' in p) {
      const pm = p as ParticipantManageItem;
      // APPROVED = has slot but not confirmed (needs payment for paid events)
      return pm.payment === null && p.status === 'APPROVED';
    }
    // For public view - APPROVED with no slot.confirmed means pending payment
    if (this.isPaidEvent()) {
      return p.status === 'APPROVED';
    }
    return false;
  }

  isPendingStatus(p: ParticipantItem): boolean {
    return p.status === 'PENDING';
  }

  getStatusIndicator(p: ParticipantItem): SemanticColor | null {
    if (p.status === 'CONFIRMED') return 'success';
    return null;
  }

  onParticipantClick(p: ParticipantItem): void {
    this.participantClicked.emit(p);
  }

  isCurrentUser(p: ParticipantItem): boolean {
    return p.userId === this.currentUserId();
  }

  isCurrentUserGuest(p: ParticipantItem): boolean {
    if (!p.isGuest || !this.currentUserId()) return false;
    return p.addedByUserId === this.currentUserId();
  }
}
