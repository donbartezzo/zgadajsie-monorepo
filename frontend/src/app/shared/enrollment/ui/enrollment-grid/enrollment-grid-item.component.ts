import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { StatusIndicatorComponent } from '../../../ui/status-indicator/status-indicator.component';
import { EventSlotInfo } from '../../../types/payment.interface';
import { DisciplineRole, STATUS_INDICATORS, type StatusIndicatorType } from '@zgadajsie/shared';
import { Enrollment, EnrolleeManageItem } from '../../../types';
import { SemanticColor } from '../../../types/colors';
import { SlotDisplayStatus } from '../../slot-status-config';

export type EnrollmentItem = Enrollment | EnrolleeManageItem;

/** @deprecated Use EnrollmentItem */
export type ParticipantItem = EnrollmentItem;

export interface SlotData {
  slotId: string | undefined;
  locked: boolean;
  slot: EventSlotInfo | null;
}

export interface SlotItem {
  slotData: SlotData;
  participant: EnrollmentItem | null;
}

export interface SlotGroup {
  role: DisciplineRole | null;
  items: SlotItem[];
  occupiedCount: number;
  totalSlots: number;
}

@Component({
  selector: 'app-enrollment-grid-item',
  imports: [UserAvatarComponent, TranslocoPipe, BadgeComponent, StatusIndicatorComponent],
  template: `
    @let _statusIndicators = statusIndicators();

    <div class="w-24 h-24 rounded-xl transition-colors">
      <button
        type="button"
        [attr.data-user-id]="participant().userId"
        [class]="buttonClass()"
        [disabled]="!clickable()"
        (click)="clicked.emit()"
      >
        <div class="relative flex flex-col items-center justify-center flex-1">
          <div class="relative">
            <app-user-avatar [user]="participant().user" size="lg" shape="rounded" />
            @if (_statusIndicators.length > 0) {
              <div
                class="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1"
              >
                @for (indicatorType of _statusIndicators; track indicatorType) {
                  <app-status-indicator [type]="indicatorType" variant="icon" />
                }
              </div>
            }
          </div>

          <span
            [class]="
              'text-[9px] text-center leading-tight mt-1 w-full line-clamp-2 h-[2.6em] flex-shrink-0 ' +
              nameClass()
            "
          >
            {{ displayName() }}
          </span>

          @if (showRole() && roleKey()) {
            <app-badge
              variant="outline"
              color="neutral"
              muted="light"
              size="xs"
              class="truncate w-full max-w-[88px]"
            >
              {{ 'dict.participant-role.' + roleKey() + '.title' | transloco }}
            </app-badge>
          }
        </div>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridItemComponent {
  readonly participant = input.required<EnrollmentItem>();
  readonly currentUserId = input<string | null>(null);
  readonly showRole = input(false);
  readonly clickable = input(true);
  readonly clicked = output<void>();

  readonly displayName = computed(() => this.participant().user?.displayName ?? 'Uczestnik');

  readonly slotDisplayStatus = computed<SlotDisplayStatus>(() => {
    const status = this.participant().status;
    if (status === 'PENDING') return 'pending';
    if (status === 'WITHDRAWN' || status === 'REJECTED') return 'withdrawn';
    return 'assigned';
  });

  readonly isCurrentUserGuest = computed(() => {
    const participant = this.participant();
    if (!participant.isGuest) return false;
    return participant.addedByUser?.id === this.currentUserId();
  });

  readonly isCurrentUser = computed(() => this.participant().userId === this.currentUserId());

  readonly isCurrentUserOrGuest = computed(() => {
    return this.isCurrentUser() || this.isCurrentUserGuest();
  });

  readonly isBanned = computed(() => {
    const participant = this.participant();
    return 'waitingReason' in participant && participant.waitingReason === 'BANNED';
  });

  readonly isNewUserPending = computed(() => {
    const participant = this.participant();
    return 'waitingReason' in participant && participant.waitingReason === 'NEW_USER';
  });

  readonly isAccountUnverified = computed(() => {
    const p = this.participant();
    if (p.isGuest) return false;
    return p.user?.isActive === false || p.user?.isEmailVerified === false;
  });

  readonly needsPayment = computed(
    () => this.participant().payment === null && this.participant().status === 'APPROVED',
  );

  readonly isPending = computed(() => this.participant().status === 'PENDING');

  readonly avatarStatus = computed<SemanticColor | null>(() => {
    const status = this.participant().status;
    if (status === 'CONFIRMED') return 'success';
    if (status === 'REJECTED') return 'danger';
    return null;
  });

  readonly statusIndicators = computed<StatusIndicatorType[]>(() => {
    const indicators: StatusIndicatorType[] = [];

    if (this.needsPayment()) {
      indicators.push('needs_payment');
    }

    if (this.isPending()) {
      indicators.push('pending');
    }

    if (this.isNewUserPending()) {
      indicators.push('new_user_pending');
    }

    if (this.isCurrentUserGuest()) {
      indicators.push('is_guest');
    }

    if (this.isBanned()) {
      indicators.push('banned');
    }

    if (this.isAccountUnverified()) {
      indicators.push('account_unverified');
    }

    const avatarStatus = this.avatarStatus();
    if (avatarStatus === 'success') {
      indicators.push('confirmed');
    }
    if (avatarStatus === 'danger') {
      indicators.push('rejected');
    }

    return indicators.filter((type) => STATUS_INDICATORS[type].requiresAction);
  });

  readonly buttonClass = computed(() => {
    if (!this.clickable()) {
      const base = 'flex flex-col items-center w-full h-full p-1 rounded-xl cursor-default';
      return this.isCurrentUserOrGuest() ? `${base} ring-2 ring-primary-100 ring-dashed` : base;
    }

    const base =
      'flex flex-col items-center w-full h-full p-1 rounded-xl transition-colors' +
      ' hover:bg-neutral-50 focus:outline-hidden';
    const status = this.slotDisplayStatus();

    if (this.isCurrentUserOrGuest()) return `${base} ring-2 ring-primary-100 ring-dashed`;
    if (status === 'pending') return `${base} focus:ring-2 focus:ring-warning-200`;
    if (status === 'withdrawn') return `${base} focus:ring-2 focus:ring-neutral-200`;
    return `${base} focus:ring-2 focus:ring-primary-200`;
  });

  readonly roleKey = computed<string | null>(() => {
    const p = this.participant();
    return p.slot?.roleKey ?? p.roleKey ?? null;
  });

  readonly nameClass = computed(() => {
    const status = this.slotDisplayStatus();
    if (status === 'withdrawn') return 'text-neutral-400';
    if (status === 'pending') return this.isBanned() ? 'text-danger-500' : 'text-warning-600';
    return 'text-neutral-700';
  });
}
