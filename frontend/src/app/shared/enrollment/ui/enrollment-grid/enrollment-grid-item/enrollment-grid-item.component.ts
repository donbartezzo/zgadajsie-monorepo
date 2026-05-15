import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { UserAvatarComponent } from '../../../../user/ui/user-avatar/user-avatar.component';
import { BadgeComponent } from '../../../../ui/badge/badge.component';
import { StatusIndicatorComponent } from '../../../../ui/status-indicator/status-indicator.component';
import { EventSlotInfo } from '../../../../types/payment.interface';
import { DisciplineRole, STATUS_INDICATORS, type StatusIndicatorType } from '@zgadajsie/shared';
import { Enrollment, EnrolleeManageItem } from '../../../../types';
import { SemanticColor } from '../../../../types/colors';
import { SlotDisplayStatus } from '../../../slot-status-config';
import { EnrollmentGridItemShellComponent } from './enrollment-grid-item-shell.component';

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
  imports: [
    UserAvatarComponent,
    TranslocoPipe,
    BadgeComponent,
    StatusIndicatorComponent,
    EnrollmentGridItemShellComponent,
  ],
  template: `
    @let _statusIndicators = statusIndicators();

    <app-enrollment-grid-item-shell
      [buttonClass]="buttonClass()"
      [dataUserId]="participant().userId ?? null"
      [label]="displayName()"
      [nameClass]="nameClass()"
      (clicked)="clicked.emit()"
    >
      <div class="relative flex">
        <app-user-avatar class="flex" [user]="participant().user" size="xl" shape="rounded" />
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

      <!-- @TODO: do poprawy w przyszłości - na razie nie wyświetlamy roli -->
      <!-- @if (showRole() && roleKey()) {
        <app-badge
          afterLabel
          variant="outline"
          color="neutral"
          muted="light"
          size="xs"
          class="truncate w-full max-w-[88px]"
        >
          {{ 'dict.participant-role.' + roleKey() + '.title' | transloco }}
        </app-badge>
      } -->
    </app-enrollment-grid-item-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridItemComponent {
  readonly participant = input.required<EnrollmentItem>();
  readonly currentUserId = input<string | null>(null);
  readonly showRole = input(false);
  readonly highlightOwn = input(true);
  readonly disabled = input(false);
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

  readonly isAwaitingApproval = computed(() => {
    const participant = this.participant();
    return 'waitingReason' in participant && participant.waitingReason === 'NOT_TRUSTED';
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

    if (this.isAwaitingApproval()) {
      indicators.push('awaiting_approval');
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
    const isDisabled = this.disabled();
    const shouldHighlight = this.highlightOwn() && this.isCurrentUserOrGuest();
    const status = this.slotDisplayStatus();

    const base =
      'flex flex-col items-center w-full h-full p-1 rounded-xl overflow-hidden' +
      (isDisabled
        ? ' pointer-events-none cursor-default'
        : ' transition-colors hover:bg-neutral-50 focus:outline-hidden');

    if (shouldHighlight) return `${base} bg-primary-50/50 ring-2 ring-primary-400`;
    if (status === 'pending') return `${base} focus:ring-2 focus:ring-warning-200`;
    if (status === 'withdrawn') return `${base} focus:ring-2 focus:ring-neutral-200`;
    return `${base} focus:ring-2 focus:ring-primary-200`;
  });

  readonly roleKey = computed<string | null>(() => {
    const p = this.participant();
    return p.slot?.roleKey ?? p.roleKey ?? null;
  });

  readonly nameClass = computed(() => {
    return 'text-neutral-700';
  });
}
