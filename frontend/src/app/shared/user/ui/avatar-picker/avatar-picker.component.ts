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
import { firstValueFrom } from 'rxjs';
import { AvatarUser, UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileBroadcastService } from '../../../../core/services/profile-broadcast.service';

@Component({
  selector: 'app-avatar-picker',
  imports: [UserAvatarComponent, ButtonComponent, IconComponent],
  templateUrl: './avatar-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerComponent {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

  readonly user = input.required<AvatarUser>();
  readonly autoGenerate = input(false);

  readonly avatarConfirmed = output<string>();
  readonly previewReady = output<void>();

  readonly previewSeed = signal<string | null>(null);
  readonly saving = signal(false);

  readonly hasPreview = computed(() => this.previewSeed() !== null);

  readonly previewUser = computed((): AvatarUser | null => {
    const s = this.previewSeed();
    if (s === null) return null;
    return { ...this.user(), avatarSeed: s };
  });

  readonly previewDifferentFromCurrent = computed(() => {
    return this.previewSeed() !== (this.user().avatarSeed ?? null);
  });

  constructor() {
    effect(() => {
      if (this.autoGenerate() && this.previewSeed() === null) {
        this.generateNew();
      }
    });
  }

  generateNew(): void {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const seed = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    this.previewSeed.set(seed);
    this.previewReady.emit();
  }

  async confirmChange(): Promise<void> {
    const newSeed = this.previewSeed();
    if (!newSeed || this.saving()) return;

    this.saving.set(true);
    try {
      const updatedUser = await firstValueFrom(
        this.userService.updateProfile({ avatarSeed: newSeed }),
      );
      this.auth.updateUser(updatedUser);
      this.profileBroadcast.notifyUserChange(updatedUser.id, { avatarSeed: newSeed });
      this.previewSeed.set(null);
      this.snackbar.success('Avatar zmieniony');
      this.avatarConfirmed.emit(newSeed);
    } catch {
      this.snackbar.error('Nie udało się zmienić avatara');
    } finally {
      this.saving.set(false);
    }
  }
}
