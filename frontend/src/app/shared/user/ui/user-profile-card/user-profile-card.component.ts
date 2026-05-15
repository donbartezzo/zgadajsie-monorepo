import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarUser, UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { AvatarPickerComponent } from '../avatar-picker/avatar-picker.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { StatusIndicatorComponent } from '../../../ui/status-indicator/status-indicator.component';
import {
  ProfileBroadcastService,
  ProfileChange,
} from '../../../../core/services/profile-broadcast.service';
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
    AvatarPickerComponent,
    IconComponent,
    ButtonComponent,
    BadgeComponent,
    FormsModule,
    StatusIndicatorComponent,
  ],
  templateUrl: './user-profile-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileCardComponent {
  private readonly profileBroadcast = inject(ProfileBroadcastService);

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
  readonly isOrganizer = input(false);
  readonly isOwnGuest = input(false);
  readonly extraBadges = input<StatusBadgeEntry[]>([]);

  readonly canEditName = input(false);
  readonly canEditAvatar = input(false);
  readonly isSaving = input(false);
  readonly forceEditingDisplayName = input(false);

  readonly displayNameChange = output<string>();
  readonly avatarSeedChange = output<string>();
  readonly displayNameInput = output<string>();
  readonly avatarSeedPreview = output<string>();
  readonly cancelled = output<void>();

  readonly editingDisplayNameMode = signal(false);
  readonly editingAvatarMode = signal(false);
  readonly tempDisplayName = signal('');
  readonly pendingAvatarSeed = signal<string | null>(null);
  private readonly overrideAvatarSeed = signal<string | null>(null);
  private readonly overrideDisplayName = signal<string | null>(null);
  private lastUserId: string | undefined = undefined;

  constructor() {
    // Reset state and re-init tempDisplayName ONLY when user identity (id) changes.
    // In draft mode the parent regenerates the user object on every keystroke,
    // so resetting on every user() change would close the input mid-typing.
    // Reads forceEditingDisplayName via untracked() to avoid coupling - changes to
    // force are handled by the dedicated effect below.
    effect(() => {
      const u = this.user();
      if (this.lastUserId !== u.id) {
        this.lastUserId = u.id;
        const isForce = untracked(() => this.forceEditingDisplayName());
        this.overrideAvatarSeed.set(null);
        this.overrideDisplayName.set(null);
        this.editingAvatarMode.set(false);
        this.tempDisplayName.set(u.displayName);
        this.pendingAvatarSeed.set(null);
        // In force mode the input must stay visible across user.id changes
        // (e.g. switching JA ↔ guest in join-rules overlay).
        this.editingDisplayNameMode.set(isForce);
      }
    });

    // Force editing display name mode when forceEditingDisplayName toggles to true
    effect(() => {
      if (this.forceEditingDisplayName()) {
        this.editingDisplayNameMode.set(true);
      }
    });

    this.profileBroadcast.changes$
      .pipe(takeUntilDestroyed())
      .subscribe((change) => this.applyBroadcastChange(change));
  }

  readonly displayName = computed(() => this.overrideDisplayName() ?? this.user().displayName);

  readonly avatarUser = computed((): AvatarUser => {
    const u = this.user();
    const baseSeed =
      'avatarSeed' in u ? ((u as { avatarSeed?: string | null }).avatarSeed ?? null) : null;
    return {
      id: u.id,
      displayName: this.editingDisplayNameMode() ? this.tempDisplayName() : this.displayName(),
      avatarSeed: this.overrideAvatarSeed() ?? baseSeed,
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
      if (this.waitingReason() === 'NOT_TRUSTED') {
        badges.push({ type: 'awaiting_approval' });
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

  readonly hasChanges = computed(() => {
    if (this.editingAvatarMode()) {
      return this.pendingAvatarSeed() !== null;
    }
    const nameChanged = (this.tempDisplayName() ?? '').trim() !== this.displayName();
    return nameChanged;
  });

  readonly _canEditName = computed(() => this.canEditName());
  readonly _canEditAvatar = computed(() => this.canEditAvatar());
  readonly _forceEditingDisplayName = computed(() => this.forceEditingDisplayName());
  readonly _isSaving = computed(() => this.isSaving());

  readonly nameInputClass = computed(() => {
    const sizes: Record<ProfileCardVariant, string> = {
      overlay: 'text-lg',
      default: 'text-xl',
    };
    return sizes[this.variant()];
  });

  startEditing(): void {
    this.tempDisplayName.set(this.displayName());
    this.editingDisplayNameMode.set(true);
  }

  requestAvatarEdit(): void {
    this.editingAvatarMode.set(true);
    this.pendingAvatarSeed.set(null);
  }

  onAvatarPreviewReady(seed: string): void {
    // Preview only locally - don't emit yet. Emitting on every preview would push
    // the new seed up to the parent immediately; in draft/force mode the parent
    // updates user.avatarSeed → the picker would lose the "current vs new" diff.
    // Emit happens in confirmEdit() (after user clicks "Zapisz" in the picker).
    this.pendingAvatarSeed.set(seed);
  }

  onTempDisplayNameChange(value: string): void {
    this.tempDisplayName.set(value);
    this.displayNameInput.emit(value);
  }

  onEscapeKey(): void {
    // In force mode, Escape does not close the name input
    if (this.forceEditingDisplayName()) {
      return;
    }
    this.cancelEditing();
  }

  cancelEditing(): void {
    const wasAvatarMode = this.editingAvatarMode();
    this.editingDisplayNameMode.set(false);
    this.editingAvatarMode.set(false);
    this.tempDisplayName.set('');
    this.pendingAvatarSeed.set(null);
    this.cancelled.emit();
    // In force mode, keep name editing visible after avatar cancel
    if (this.forceEditingDisplayName() && wasAvatarMode) {
      this.editingDisplayNameMode.set(true);
    }
  }

  confirmEdit(): void {
    if (!this.hasChanges() || this._isSaving()) return;
    if (this.editingAvatarMode()) {
      const seed = this.pendingAvatarSeed();
      if (seed !== null) {
        // In draft/force mode: parent collects the seed in its own state and
        // commits everything together on overlay submit. In commit mode: parent
        // calls API (e.g. via UserProfileEditService) on each change.
        if (this.forceEditingDisplayName()) {
          this.avatarSeedPreview.emit(seed);
        } else {
          this.avatarSeedChange.emit(seed);
        }
        this.editingAvatarMode.set(false);
        this.pendingAvatarSeed.set(null);
        // In force mode, keep name editing visible after avatar edit is done
        if (this.forceEditingDisplayName()) {
          this.editingDisplayNameMode.set(true);
        }
      }
    } else if (this.editingDisplayNameMode()) {
      const name = (this.tempDisplayName() ?? '').trim();
      if (name && name.length >= 3 && name !== this.displayName()) {
        this.displayNameChange.emit(name);
        if (!this.forceEditingDisplayName()) {
          this.editingDisplayNameMode.set(false);
        }
      }
    }
  }

  private applyBroadcastChange(change: ProfileChange): void {
    const u = this.user();
    const matchesUser = change.type === 'user' && change.userId === u.id;
    const matchesGuest =
      change.type === 'guest' && change.participationId === this.participationId();
    if (!matchesUser && !matchesGuest) return;

    if (change.changes.displayName !== undefined) {
      this.overrideDisplayName.set(change.changes.displayName);
    }
    if (change.changes.avatarSeed !== undefined) {
      this.overrideAvatarSeed.set(change.changes.avatarSeed ?? null);
    }
  }
}
