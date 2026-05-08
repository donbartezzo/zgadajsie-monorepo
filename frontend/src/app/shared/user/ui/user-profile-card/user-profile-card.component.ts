import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarUser, UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { StatusIndicatorComponent } from '../../../ui/status-indicator/status-indicator.component';
import { User } from '../../../types/user.interface';
import { UserBrief } from '../../../types/common.interface';
import { ParticipationStatus, WaitingReason } from '../../../types/participation.interface';
import { ParticipantPaymentInfo } from '../../../types/payment.interface';
import { SemanticColor } from '../../../types/colors';
import { type StatusIndicatorType, type StatusBadgeEntry } from '@zgadajsie/shared';

const PARTICIPATION_STATUS_TO_BADGE: Record<ParticipationStatus, StatusIndicatorType> = {
  CONFIRMED: 'confirmed',
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

export interface UserProfileStats {
  label: string;
  value: string | number;
  icon?: string;
  color?: SemanticColor;
}

export type ProfileCardVariant = 'default' | 'overlay';
export type ProfileCardContext = 'profile' | 'participant' | 'organizer';

@Component({
  selector: 'app-user-profile-card',
  imports: [
    CommonModule,
    UserAvatarComponent,
    IconComponent,
    ButtonComponent,
    FormsModule,
    StatusIndicatorComponent,
  ],
  templateUrl: './user-profile-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileCardComponent {
  readonly user = input.required<User | UserBrief>();
  readonly context = input<ProfileCardContext>('profile');
  readonly participationStatus = input<ParticipationStatus | null>(null);
  readonly waitingReason = input<WaitingReason | null>(null);
  readonly paymentInfo = input<ParticipantPaymentInfo | null>(null);
  readonly isGuest = input(false);
  readonly variant = input<ProfileCardVariant>('default');
  readonly stats = input<UserProfileStats[]>([]);
  readonly description = input<string | null>(null);
  readonly participationId = input<string | null>(null);
  readonly currentUserId = input<string | null>(null);
  readonly isOrganizer = input(false);
  readonly loading = input(false);
  readonly isOwnGuest = input(false);
  readonly extraBadges = input<StatusBadgeEntry[]>([]);

  readonly profileUpdated = output<{ displayName: string }>();
  readonly guestUpdated = output<{ participationId: string; displayName: string }>();

  readonly editingMode = signal(false);
  readonly tempDisplayName = signal('');

  readonly displayName = computed(() => this.user().displayName);

  readonly avatarUser = computed((): AvatarUser => {
    const u = this.user();
    const avatarSeed =
      'avatarSeed' in u ? ((u as { avatarSeed?: string | null }).avatarSeed ?? null) : null;
    return {
      id: this.user().id,
      displayName: this.editingMode() ? this.tempDisplayName() : this.displayName(),
      avatarSeed,
    };
  });
  readonly subtitle = computed(() => {
    const user = this.user();
    switch (this.context()) {
      case 'profile':
        return 'email' in user ? user.email : null;
      case 'participant':
      case 'organizer':
        return this.isGuest() ? 'Gość' : null;
      default:
        return null;
    }
  });
  readonly allStatusBadges = computed<StatusBadgeEntry[]>(() => {
    const badges: StatusBadgeEntry[] = [];
    const status = this.participationStatus();
    const ctx = this.context();

    if (status) {
      const inEnrollmentCtx = ctx === 'participant' || ctx === 'organizer';
      if (status === 'APPROVED' && inEnrollmentCtx) {
        const payment = this.paymentInfo();
        const amountDetail = payment?.amount ? `${payment.amount} zł` : null;
        if (!payment) {
          badges.push({ type: 'needs_payment' });
        } else {
          const s = payment.status;
          if (s === 'COMPLETED') badges.push({ type: 'payment_completed', detail: amountDetail });
          else if (s === 'VOUCHER_REFUNDED' || s === 'REFUNDED')
            badges.push({ type: 'payment_refunded', detail: amountDetail });
          else badges.push({ type: 'payment_pending', detail: amountDetail });
        }
      } else {
        badges.push({ type: PARTICIPATION_STATUS_TO_BADGE[status] });
      }
    }

    if (!this.isGuest()) {
      const user = this.user();
      const isActive = 'isActive' in user ? user.isActive : undefined;
      const isEmailVerified = 'isEmailVerified' in user ? user.isEmailVerified : undefined;
      if (isActive === false || isEmailVerified === false) {
        badges.push({ type: 'email_not_verified' });
      }
    }

    if (ctx === 'participant' || ctx === 'organizer') {
      if (this.waitingReason() === 'NEW_USER') {
        badges.push({ type: 'new_user_pending' });
      }
    }

    return [...badges, ...this.extraBadges()];
  });

  readonly avatarSize = computed(() => {
    const sizes: Record<ProfileCardVariant, 'xl' | '2xl' | '3xl'> = {
      overlay: '3xl',
      default: '3xl',
    };
    return sizes[this.variant()];
  });

  readonly containerClass = computed(() => {
    const variants: Record<ProfileCardVariant, string> = {
      overlay: 'py-4',
      default: 'py-6',
    };
    return variants[this.variant()];
  });

  readonly nameClass = computed(() => {
    const variants: Record<ProfileCardVariant, string> = {
      overlay: 'text-lg',
      default: 'text-xl',
    };
    return variants[this.variant()];
  });

  readonly canEditName = computed(() => {
    const userId = this.currentUserId();
    const isGuest = this.isGuest();
    const participationId = this.participationId();

    if (userId && this.user().id === userId) return true;
    if (isGuest && participationId && this.isOwnGuest()) return true;

    return false;
  });

  readonly canEditAvatar = computed(() => {
    return false;
  });

  readonly hasChanges = computed(() => {
    const nameChanged = this.tempDisplayName().trim() !== this.displayName();
    return nameChanged;
  });

  readonly nameInputClass = computed(() => {
    const sizes: Record<ProfileCardVariant, string> = {
      overlay: 'text-lg',
      default: 'text-xl',
    };
    return sizes[this.variant()];
  });

  startEditing(): void {
    this.tempDisplayName.set(this.displayName());
    this.editingMode.set(true);
  }

  cancelEditing(): void {
    this.editingMode.set(false);
    this.tempDisplayName.set('');
  }

  saveChanges(): void {
    if (!this.hasChanges()) return;

    const newDisplayName = this.tempDisplayName().trim();
    const isGuest = this.isGuest();
    const participationId = this.participationId();

    if (isGuest && participationId) {
      if (newDisplayName !== this.displayName()) {
        this.guestUpdated.emit({
          participationId,
          displayName: newDisplayName,
        });
      }
    } else {
      if (newDisplayName !== this.displayName()) {
        this.profileUpdated.emit({ displayName: newDisplayName });
      }
    }

    this.editingMode.set(false);
  }
}
