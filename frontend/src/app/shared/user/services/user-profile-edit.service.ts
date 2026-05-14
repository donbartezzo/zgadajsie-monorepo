import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { EventService } from '../../../core/services/event.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { ProfileBroadcastService } from '../../../core/services/profile-broadcast.service';
import { User } from '../../types/user.interface';
import { UserBrief } from '../../types/common.interface';

@Injectable({ providedIn: 'root' })
export class UserProfileEditService {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly eventService = inject(EventService);
  private readonly snackbar = inject(SnackbarService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

  async commitDisplayName(opts: {
    user: User | UserBrief;
    displayName: string;
    isGuest?: boolean;
    participationId?: string | null;
  }): Promise<void> {
    const { user: _user, displayName, isGuest = false, participationId = null } = opts;

    try {
      if (isGuest && participationId) {
        const updated = await firstValueFrom(
          this.eventService.updateGuest(participationId, { displayName }),
        );
        this.profileBroadcast.notifyGuestChange(participationId, {
          displayName: updated.displayName,
        });
        this.snackbar.success('Nazwa gościa zaktualizowana');
      } else {
        const updatedUser: User = await firstValueFrom(
          this.userService.updateProfile({ displayName }),
        );
        this.auth.updateUser(updatedUser);
        this.profileBroadcast.notifyUserChange(updatedUser.id, {
          displayName: updatedUser.displayName,
        });
        this.snackbar.success('Profil zaktualizowany');
      }
    } catch (err: unknown) {
      const fallback =
        isGuest && participationId ? 'Błąd aktualizacji nazwy gościa' : 'Błąd aktualizacji profilu';
      const message = (err as { error?: { message?: string } })?.error?.message ?? fallback;
      this.snackbar.error(message);
      throw err;
    }
  }

  async commitAvatarSeed(opts: {
    user: User | UserBrief;
    avatarSeed: string;
    isGuest?: boolean;
    participationId?: string | null;
  }): Promise<void> {
    const { user: _user, avatarSeed, isGuest = false, participationId = null } = opts;

    try {
      if (isGuest && participationId) {
        await firstValueFrom(this.eventService.updateGuest(participationId, { avatarSeed }));
        this.profileBroadcast.notifyGuestChange(participationId, { avatarSeed });
      } else {
        const updatedUser: User = await firstValueFrom(
          this.userService.updateProfile({ avatarSeed }),
        );
        this.auth.updateUser(updatedUser);
        this.profileBroadcast.notifyUserChange(updatedUser.id, { avatarSeed });
      }
      this.snackbar.success('Avatar zmieniony');
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        'Nie udało się zmienić avatara';
      this.snackbar.error(message);
      throw err;
    }
  }
}
