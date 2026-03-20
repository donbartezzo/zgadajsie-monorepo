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
  template: `
    @let _editingMode = editingMode(); @let _displayName = displayName(); @let _tempDisplayName =
    tempDisplayName(); @let _tempAvatarUrl = tempAvatarUrl(); @let _avatarUrl = avatarUrl(); @let
    _variant = variant(); @let _canEditName = canEditName(); @let _canEditAvatar = canEditAvatar();
    @let _subtitle = subtitle(); @let _statusBadge = statusBadge(); @let _statusBadgeClass =
    statusBadgeClass(); @let _statusBadgeIcon = statusBadgeIcon(); @let _hasChanges = hasChanges();
    @let _stats = stats(); @let _description = description();

    <div class="flex flex-col items-center text-center" [ngClass]="containerClass()">
      <div class="relative">
        <app-user-avatar
          [avatarUrl]="_editingMode ? _tempAvatarUrl : _avatarUrl"
          [displayName]="_editingMode ? _tempDisplayName : _displayName"
          [size]="avatarSize()"
          shape="rounded"
          [showPaymentWarning]="showPaymentWarning()"
          [showPending]="showPending()"
        />
        @if (_canEditAvatar && !_editingMode) {
        <button
          (click)="startEditing()"
          class="absolute bottom-0 right-0 bg-primary-500 text-white rounded-full p-1.5 shadow-lg hover:bg-primary-600 transition-colors"
        >
          <app-icon name="edit" size="xs" />
        </button>
        }
      </div>

      <div class="mt-3 flex items-center gap-2" [ngClass]="nameClass()">
        @if (_editingMode) {
        <input
          [(ngModel)]="tempDisplayName"
          class="font-bold text-neutral-900 bg-transparent border-b-2 border-primary-500 text-center outline-none"
          [ngClass]="nameInputClass()"
          (keyup.enter)="saveChanges()"
          (keyup.escape)="cancelEditing()"
        />
        } @else {
        <h2 class="font-bold text-neutral-900">{{ _displayName }}</h2>
        } @if (_canEditName && !_editingMode) {
        <button
          (click)="startEditing()"
          class="text-primary-500 hover:text-primary-600 transition-colors"
        >
          <app-icon name="edit" size="sm" />
        </button>
        }
      </div>

      @if (_subtitle && !_editingMode) {
      <p class="text-xs text-primary-500 font-medium -mt-0.5">{{ _subtitle }}</p>
      } @if (_statusBadge && !_editingMode) {
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1"
        [ngClass]="_statusBadgeClass"
      >
        @if (_statusBadgeIcon) {
        <app-icon [name]="$any(_statusBadgeIcon)" size="xs" />
        }
        {{ _statusBadge }}
      </span>
      } @if (_editingMode) {
      <div class="mt-4 flex gap-2">
        <app-button
          appearance="soft"
          color="primary"
          size="sm"
          [disabled]="!_hasChanges"
          (clicked)="saveChanges()"
        >
          <app-icon name="check" size="xs" class="mr-1" />
          Zapisz
        </app-button>
        <app-button appearance="outline" color="neutral" size="sm" (clicked)="cancelEditing()">
          <app-icon name="x" size="xs" class="mr-1" />
          Anuluj
        </app-button>
      </div>
      } @if (_stats.length > 0 && _variant !== 'compact' && !_editingMode) {
      <div class="flex items-center justify-center gap-6 mt-4 w-full">
        @for (stat of _stats; track stat.label) {
        <div class="flex flex-col items-center">
          @if (stat.icon) {
          <app-icon
            [name]="$any(stat.icon)"
            size="md"
            [color]="stat.color ?? 'neutral'"
            [class]="stat.color ? '' : 'text-neutral-400'"
          />
          }
          <span class="text-lg font-bold text-neutral-900">{{ stat.value }}</span>
          <span class="text-[10px] text-neutral-500 -mt-1">{{ stat.label }}</span>
        </div>
        }
      </div>
      } @if (_description && _variant !== 'compact' && !_editingMode) {
      <p class="text-sm text-neutral-600 mt-3 line-clamp-3">{{ _description }}</p>
      } @if (!_editingMode) {
      <ng-content></ng-content>
      }
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
