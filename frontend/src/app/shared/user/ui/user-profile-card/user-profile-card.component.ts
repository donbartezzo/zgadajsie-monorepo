import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { User } from '../../../types/user.interface';
import { UserBrief } from '../../../types/common.interface';
import { ParticipationStatus } from '../../../types/participation.interface';
import { Payment } from '../../../types/payment.interface';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../../types/colors';

export interface UserProfileStats {
  label: string;
  value: string | number;
  icon?: string;
  color?: SemanticColor;
}

export type ProfileCardVariant = 'default' | 'compact' | 'overlay';
export type ProfileCardContext = 'profile' | 'participant' | 'organizer';

export interface ProfileEditData {
  displayName?: string;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-user-profile-card',
  imports: [CommonModule, UserAvatarComponent, IconComponent, ButtonComponent, FormsModule],
  templateUrl: './user-profile-card.component.html',
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
  readonly participationId = input<string | null>(null);
  readonly currentUserId = input<string | null>(null);
  readonly isOrganizer = input(false);
  readonly loading = input(false);
  readonly addedByUserId = input<string | null>(null);

  readonly profileUpdated = output<ProfileEditData>();
  readonly guestUpdated = output<{ participationId: string; displayName: string }>();

  readonly editingMode = signal(false);
  readonly tempDisplayName = signal('');
  readonly tempAvatarUrl = signal<string | null>(null);

  readonly avatarUrl = computed(() => this.user().avatarUrl ?? null);
  readonly displayName = computed(() => this.user().displayName);
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
  readonly statusBadge = computed(() => {
    if (this.context() === 'profile') {
      const user = this.user();
      if ('isEmailVerified' in user) {
        return user.isEmailVerified ? null : 'Email nie zweryfikowany';
      }
      return null;
    }
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
  readonly statusBadgeColor = computed<SemanticColor>(() => {
    if (this.context() === 'profile') {
      const user = this.user();
      if ('isEmailVerified' in user) {
        return user.isEmailVerified ? 'success' : 'warning';
      }
      return 'neutral';
    }

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
  });
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
    const color = this.statusBadgeColor();
    return `${SEMANTIC_COLOR_CLASSES.surface[color]} ${SEMANTIC_COLOR_CLASSES.textStrong[color]}`;
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
      compact: 'text-base',
      overlay: 'text-lg',
      default: 'text-xl',
    };
    return sizes[this.variant()];
  });

  isOwnGuest(): boolean {
    const currentUserId = this.currentUserId();
    const addedByUserId = this.addedByUserId();
    const isGuest = this.isGuest();

    return isGuest && !!addedByUserId && addedByUserId === currentUserId;
  }

  startEditing(): void {
    this.tempDisplayName.set(this.displayName());
    this.tempAvatarUrl.set(this.avatarUrl());
    this.editingMode.set(true);
  }

  cancelEditing(): void {
    this.editingMode.set(false);
    this.tempDisplayName.set('');
    this.tempAvatarUrl.set(null);
  }

  saveChanges(): void {
    if (!this.hasChanges()) return;

    const newDisplayName = this.tempDisplayName().trim();
    const newAvatarUrl = this.tempAvatarUrl();
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
      const updateData: ProfileEditData = {};

      if (newDisplayName !== this.displayName()) {
        updateData.displayName = newDisplayName;
      }

      if (newAvatarUrl !== this.avatarUrl()) {
        updateData.avatarUrl = newAvatarUrl;
      }

      if (Object.keys(updateData).length > 0) {
        this.profileUpdated.emit(updateData);
      }
    }

    this.editingMode.set(false);
  }
}
