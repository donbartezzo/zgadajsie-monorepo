import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AvatarUser, UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { AvatarPickerComponent } from '../avatar-picker/avatar-picker.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { StatusIndicatorComponent } from '../../../ui/status-indicator/status-indicator.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
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
    FormsModule,
    StatusIndicatorComponent,
  ],
  templateUrl: './user-profile-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileCardComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);
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

  readonly guestUpdated = output<{ participationId: string; displayName: string }>();

  readonly editingDisplayNameMode = signal(false);
  readonly editingAvatarMode = signal(false);
  readonly tempDisplayName = signal('');
  readonly pendingAvatarSeed = signal<string | null>(null);
  readonly saving = signal(false);
  private readonly overrideAvatarSeed = signal<string | null>(null);
  private readonly overrideDisplayName = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.user();
      this.overrideAvatarSeed.set(null);
      this.overrideDisplayName.set(null);
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
    const currentUserId = this.auth.currentUser()?.id ?? null;
    if (currentUserId && this.user().id === currentUserId) return true;
    if (this.isGuest() && this.participationId() && this.isOwnGuest()) return true;
    return false;
  });

  readonly canEditAvatar = computed(() => {
    const currentUserId = this.auth.currentUser()?.id ?? null;
    if (currentUserId && this.user().id === currentUserId) return true;
    if (this.isGuest() && this.participationId() && this.isOwnGuest()) return true;
    return false;
  });

  readonly hasChanges = computed(() => {
    if (this.editingAvatarMode()) {
      return this.pendingAvatarSeed() !== null;
    }
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
    this.editingDisplayNameMode.set(true);
  }

  requestAvatarEdit(): void {
    this.editingAvatarMode.set(true);
    this.pendingAvatarSeed.set(null);
  }

  onAvatarPreviewReady(seed: string): void {
    this.pendingAvatarSeed.set(seed);
  }

  cancelEditing(): void {
    this.editingDisplayNameMode.set(false);
    this.editingAvatarMode.set(false);
    this.tempDisplayName.set('');
    this.pendingAvatarSeed.set(null);
  }

  async saveChanges(): Promise<void> {
    if (this.editingAvatarMode()) {
      await this.saveAvatar();
    } else {
      await this.saveName();
    }
  }

  async saveName(): Promise<void> {
    if (!this.hasChanges() || this.saving()) return;

    const newDisplayName = this.tempDisplayName().trim();
    if (newDisplayName === this.displayName()) {
      this.editingDisplayNameMode.set(false);
      return;
    }

    const isGuest = this.isGuest();
    const participationId = this.participationId();

    if (isGuest && participationId) {
      this.guestUpdated.emit({ participationId, displayName: newDisplayName });
      this.editingDisplayNameMode.set(false);
      return;
    }

    this.saving.set(true);
    try {
      const updatedUser = await firstValueFrom(
        this.userService.updateProfile({ displayName: newDisplayName }),
      );
      this.auth.updateUser(updatedUser);
      this.profileBroadcast.notifyUserChange(updatedUser.id, {
        displayName: updatedUser.displayName,
      });
      this.snackbar.success('Profil zaktualizowany');
      this.editingDisplayNameMode.set(false);
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? 'Błąd aktualizacji profilu';
      this.snackbar.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  async saveAvatar(): Promise<void> {
    if (this.saving()) return;
    const newSeed = this.pendingAvatarSeed();
    if (newSeed === null) return;

    const isGuest = this.isGuest();
    const participationId = this.participationId();

    this.saving.set(true);
    try {
      if (isGuest && participationId) {
        await firstValueFrom(
          this.eventService.updateGuest(participationId, { avatarSeed: newSeed }),
        );
        this.profileBroadcast.notifyGuestChange(participationId, { avatarSeed: newSeed });
      } else {
        const updatedUser = await firstValueFrom(
          this.userService.updateProfile({ avatarSeed: newSeed }),
        );
        this.auth.updateUser(updatedUser);
        this.profileBroadcast.notifyUserChange(updatedUser.id, { avatarSeed: newSeed });
      }
      this.overrideAvatarSeed.set(newSeed);
      this.snackbar.success('Avatar zmieniony');
      this.editingAvatarMode.set(false);
      this.pendingAvatarSeed.set(null);
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        'Nie udało się zmienić avatara';
      this.snackbar.error(message);
    } finally {
      this.saving.set(false);
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
