import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { IconComponent } from '../../../core/icons/icon.component';
import { User } from '../../types/user.interface';
import { UserBrief } from '../../types/common.interface';
import { ParticipationStatus } from '../../types/participation.interface';
import { Payment } from '../../types/payment.interface';

export interface UserProfileStats {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export type ProfileCardVariant = 'default' | 'compact' | 'overlay';
export type ProfileCardContext = 'profile' | 'participant' | 'organizer';

@Component({
  selector: 'app-user-profile-card',
  imports: [CommonModule, UserAvatarComponent, IconComponent],
  template: `
    <div class="flex flex-col items-center text-center" [ngClass]="containerClass()">
      <!-- Avatar (always rounded square) -->
      <app-user-avatar
        [avatarUrl]="avatarUrl()"
        [displayName]="displayName()"
        [size]="avatarSize()"
        shape="rounded"
        [showPaymentWarning]="showPaymentWarning()"
        [showPending]="showPending()"
      />

      <!-- Name -->
      <h2 class="font-bold text-neutral-900 mt-3" [ngClass]="nameClass()">
        {{ displayName() }}
      </h2>

      <!-- Subtitle / Role -->
      @if (subtitle()) {
      <p class="text-xs text-primary-500 font-medium -mt-0.5">{{ subtitle() }}</p>
      }

      <!-- Status badge -->
      @if (statusBadge()) {
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1"
        [ngClass]="statusBadgeClass()"
      >
        @if (statusBadgeIcon()) {
        <app-icon [name]="$any(statusBadgeIcon())" size="xs" />
        }
        {{ statusBadge() }}
      </span>
      }

      <!-- Stats row (like in delivery-profile template) -->
      @if (stats().length > 0 && variant() !== 'compact') {
      <div class="flex items-center justify-center gap-6 mt-4 w-full">
        @for (stat of stats(); track stat.label) {
        <div class="flex flex-col items-center">
          @if (stat.icon) {
          <app-icon [name]="$any(stat.icon)" size="md" [class]="stat.color ?? 'text-neutral-400'" />
          }
          <span class="text-lg font-bold text-neutral-900">{{ stat.value }}</span>
          <span class="text-[10px] text-neutral-500 -mt-1">{{ stat.label }}</span>
        </div>
        }
      </div>
      }

      <!-- Description -->
      @if (description() && variant() !== 'compact') {
      <p class="text-sm text-neutral-600 mt-3 line-clamp-3">{{ description() }}</p>
      }

      <!-- Content projection for actions -->
      <ng-content></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileCardComponent {
  readonly user = input.required<User | UserBrief>();
  readonly context = input<ProfileCardContext>('profile');
  readonly participationStatus = input<ParticipationStatus | null>(null);
  readonly paymentInfo = input<Payment | null>(null);
  readonly isGuest = input(false);
  readonly variant = input<ProfileCardVariant>('default');
  readonly stats = input<UserProfileStats[]>([]);
  readonly description = input<string | null>(null);

  // Computed properties derived from new inputs
  readonly avatarUrl = computed(() => this.user().avatarUrl ?? null);
  readonly displayName = computed(() => this.user().displayName);
  readonly subtitle = computed(() => {
    const user = this.user();
    switch (this.context()) {
      case 'profile':
        // For profile context, user should be full User with email
        return 'email' in user ? user.email : null;
      case 'participant':
      case 'organizer':
        return this.isGuest() ? 'Gość' : null;
      default:
        return null;
    }
  });
  readonly statusBadge = computed(() => {
    // Profile context - email verification status
    if (this.context() === 'profile') {
      const user = this.user();
      if ('isEmailVerified' in user) {
        return user.isEmailVerified ? null : 'Email nie zweryfikowany';
      }
      return null;
    }
    // Participant context - participation status
    if (this.context() === 'participant' || this.context() === 'organizer') {
      const status = this.participationStatus();
      switch (status) {
        case 'CONFIRMED':
          return 'Potwierdzony';
        case 'APPROVED':
          return 'Zatwierdzony';
        case 'PENDING':
          return 'Oczekujący';
        case 'REJECTED':
          return 'Odrzucony';
        case 'WITHDRAWN':
          return 'Wypisany';
        default:
          return null;
      }
    }
    return null;
  });
  readonly statusBadgeVariant = computed<'success' | 'warning' | 'danger' | 'info' | 'neutral'>(
    () => {
      // Profile context
      if (this.context() === 'profile') {
        const user = this.user();
        if ('isEmailVerified' in user) {
          return user.isEmailVerified ? 'success' : 'warning';
        }
        return 'neutral';
      }
      // Participant context
      if (this.context() === 'participant' || this.context() === 'organizer') {
        const status = this.participationStatus();
        switch (status) {
          case 'CONFIRMED':
            return 'success';
          case 'APPROVED':
            return 'info';
          case 'PENDING':
            return 'warning';
          case 'REJECTED':
            return 'danger';
          default:
            return 'neutral';
        }
      }
      return 'neutral';
    },
  );
  readonly statusBadgeIcon = computed<string | null>(() => {
    if (this.context() === 'profile') {
      return null;
    }
    const status = this.participationStatus();
    switch (status) {
      case 'CONFIRMED':
        return 'check';
      case 'PENDING':
        return 'clock';
      case 'REJECTED':
        return 'x';
      default:
        return null;
    }
  });
  readonly showPaymentWarning = computed(() => {
    if (this.context() !== 'participant' && this.context() !== 'organizer') {
      return false;
    }
    // Show warning if payment needed but not completed
    return this.participationStatus() === 'APPROVED' && !this.paymentInfo();
  });
  readonly showPending = computed(() => this.participationStatus() === 'PENDING');

  readonly avatarSize = computed(() => {
    const sizes: Record<ProfileCardVariant, 'lg' | 'xl' | '2xl'> = {
      compact: 'lg',
      overlay: 'xl',
      default: '2xl',
    };
    return sizes[this.variant()];
  });

  readonly containerClass = computed(() => {
    const variants: Record<ProfileCardVariant, string> = {
      compact: 'py-2',
      overlay: 'py-4',
      default: 'py-6',
    };
    return variants[this.variant()];
  });

  readonly nameClass = computed(() => {
    const variants: Record<ProfileCardVariant, string> = {
      compact: 'text-base',
      overlay: 'text-lg',
      default: 'text-xl',
    };
    return variants[this.variant()];
  });

  readonly statusBadgeClass = computed(() => {
    const colors: Record<string, string> = {
      success: 'bg-success-50 text-success-600',
      warning: 'bg-warning-50 text-warning-600',
      danger: 'bg-danger-50 text-danger-600',
      info: 'bg-info-50 text-info-600',
      neutral: 'bg-neutral-100 text-neutral-600',
    };
    return colors[this.statusBadgeVariant()];
  });
}
