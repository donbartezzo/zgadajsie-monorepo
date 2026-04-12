import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '../../../ui/icon/icon.component';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Participation, ParticipantManageItem } from '../../../types';
import { SemanticColor } from '../../../types/colors';
import { SlotDisplayStatus } from '../../slot-status-config';

export type ParticipantItem = Participation | ParticipantManageItem;

export interface SlotData {
  slotId: string | undefined;
  locked: boolean;
  slot: EventSlotInfo | null;
}

export interface SlotItem {
  slotData: SlotData;
  participant: ParticipantItem | null;
}

@Component({
  selector: 'app-participant-grid-item',
  imports: [IconComponent, UserAvatarComponent, TranslocoPipe, BadgeComponent],
  template: `
    @let _statusIndicators = statusIndicators();

    <div class="w-24 h-24 rounded-xl transition-colors">
      <button
        type="button"
        [attr.data-user-id]="participant().userId"
        [class]="buttonClass()"
        (click)="clicked.emit()"
      >
        <div class="relative flex flex-col items-center justify-center flex-1">
          <div class="relative">
            <app-user-avatar
              [avatarUrl]="avatarUrl()"
              [displayName]="displayName()"
              size="lg"
              shape="rounded"
            />
            @if (_statusIndicators.length > 0) {
              <div
                class="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1"
              >
                @for (indicator of _statusIndicators; track indicator.icon) {
                  <span
                    [class]="indicatorClass + ' bg-' + indicator.color + '-400'"
                    [title]="indicator.tooltip"
                  >
                    <app-icon [name]="$any(indicator.icon)" size="xs" class="text-white" />
                  </span>
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
export class ParticipantGridItemComponent {
  readonly participant = input.required<ParticipantItem>();
  readonly currentUserId = input<string | null>(null);
  readonly showRole = input(false);
  readonly clicked = output<void>();

  readonly displayName = computed(() => this.participant().user?.displayName ?? 'Uczestnik');
  readonly avatarUrl = computed(() => this.participant().user?.avatarUrl ?? null);

  readonly slotDisplayStatus = computed<SlotDisplayStatus>(() => {
    const status = this.participant().status;
    if (status === 'PENDING') return 'pending';
    if (status === 'WITHDRAWN' || status === 'REJECTED') return 'withdrawn';
    return 'participant';
  });

  readonly isCurrentUserGuest = computed(() => {
    const participant = this.participant();
    if (!participant.isGuest) return false;
    return participant.addedByUserId === this.currentUserId();
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

  readonly showPending = computed(
    () => this.participant().status === 'PENDING' && !this.isBanned() && !this.isNewUserPending(),
  );

  readonly avatarStatus = computed<SemanticColor | null>(() => {
    const status = this.participant().status;
    if (status === 'CONFIRMED') return 'success';
    if (status === 'REJECTED') return 'danger';
    return null;
  });

  readonly statusIndicators = computed(() => {
    const indicators: { icon: string; tooltip: string; color: SemanticColor }[] = [];

    if (this.needsPayment()) {
      indicators.push({ icon: 'credit-card', tooltip: 'Oczekuje na płatność', color: 'warning' });
    }

    if (this.showPending()) {
      indicators.push({ icon: 'clock', tooltip: 'Oczekuje na zatwierdzenie', color: 'warning' });
    }

    if (this.isNewUserPending()) {
      indicators.push({
        icon: 'help-circle',
        tooltip: 'Nowy uczestnik — wymaga weryfikacji organizatora',
        color: 'info',
      });
    }

    if (this.isCurrentUserGuest()) {
      indicators.push({ icon: 'user-plus', tooltip: 'Gość dodany przez ciebie', color: 'info' });
    }

    if (this.isBanned()) {
      indicators.push({ icon: 'shield-alert', tooltip: 'Zbanowany', color: 'danger' });
    }

    if (this.isAccountUnverified()) {
      indicators.push({ icon: 'alert-triangle', tooltip: 'Konto niezweryfikowane', color: 'warning' });
    }

    const avatarStatus = this.avatarStatus();
    if (avatarStatus === 'success') {
      indicators.push({ icon: 'check', tooltip: 'Potwierdzony', color: 'success' });
    }
    if (avatarStatus === 'danger') {
      indicators.push({ icon: 'x', tooltip: 'Odrzucony', color: 'danger' });
    }

    return indicators;
  });

  readonly indicatorClass =
    'inline-flex items-center justify-center w-5 h-5 rounded-full shadow-xs border border-white';

  readonly buttonClass = computed(() => {
    const base =
      'flex flex-col items-center w-full h-full p-2 rounded-xl transition-colors' +
      ' hover:bg-neutral-50 focus:outline-hidden';
    const status = this.slotDisplayStatus();

    // Current user and their guests: unified green styling
    if (this.isCurrentUserOrGuest()) {
      return `${base} ring-2 ring-primary-100 ring-dashed`;
    }

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
