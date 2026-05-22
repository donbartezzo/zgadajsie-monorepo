import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DEFAULT_WELCOME_MESSAGE } from '@zgadajsie/shared';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserProfileCardComponent } from '../../../../shared/user/ui/user-profile-card/user-profile-card.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { UserProfileEditService } from '../../../../shared/user/services/user-profile-edit.service';
import { isSupportedDonationUrl } from '../../../../shared/utils/support-url.utils';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
    UserProfileCardComponent,
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(SnackbarService);
  private readonly profileEdit = inject(UserProfileEditService);

  newPassword = '';
  currentPassword = '';
  editDonationUrl = '';
  editWelcomeMessage = '';
  editWelcomeMessageEnabled = true;
  readonly saving = signal(false);
  readonly savingWelcome = signal(false);
  readonly donationUrlError = signal<string | null>(null);
  readonly isSavingProfile = signal(false);
  readonly defaultWelcomeMessage = DEFAULT_WELCOME_MESSAGE;

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.editDonationUrl = user.donationUrl ?? '';
      this.editWelcomeMessage = user.welcomeMessage ?? '';
      this.editWelcomeMessageEnabled = user.welcomeMessageEnabled ?? true;
    }
  }

  validateDonationUrl(): void {
    const url = this.editDonationUrl.trim();
    if (!url) {
      this.donationUrlError.set(null);
      return;
    }
    if (!isSupportedDonationUrl(url)) {
      this.donationUrlError.set(
        'Ten serwis nie jest przez nas obsługiwany. Wklej link z jednego z obsługiwanych serwisów.',
      );
      this.editDonationUrl = '';
    } else {
      this.donationUrlError.set(null);
    }
  }

  async resendActivation(): Promise<void> {
    try {
      await this.auth.resendActivation();
      this.snackbar.success('Link aktywacyjny wysłany');
    } catch {
      this.snackbar.error('Nie udało się wysłać');
    }
  }

  saveProfile(): void {
    this.validateDonationUrl();
    if (this.donationUrlError()) {
      return;
    }
    this.saving.set(true);
    const data: {
      donationUrl?: string | null;
      newPassword?: string;
      currentPassword?: string;
    } = {
      donationUrl: this.editDonationUrl.trim() || null,
    };
    if (this.newPassword) {
      data.newPassword = this.newPassword;
      data.currentPassword = this.currentPassword;
    }
    this.userService.updateProfile(data).subscribe({
      next: (updatedUser) => {
        // Update currentUser in AuthService to reflect changes immediately
        this.auth.updateUser(updatedUser);
        this.snackbar.success('Profil zaktualizowany');
        this.saving.set(false);
        this.newPassword = '';
        this.currentPassword = '';
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Błąd zapisu');
        this.saving.set(false);
      },
    });
  }

  saveWelcomeMessage(): void {
    this.savingWelcome.set(true);
    const data = {
      welcomeMessage: this.editWelcomeMessage.trim() || null,
      welcomeMessageEnabled: this.editWelcomeMessageEnabled,
    };
    this.userService.updateProfile(data).subscribe({
      next: (updatedUser) => {
        this.auth.updateUser(updatedUser);
        this.snackbar.success('Ustawienia wiadomości powitalnej zapisane');
        this.savingWelcome.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Błąd zapisu');
        this.savingWelcome.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.snackbar.success('Wylogowano pomyślnie');
  }

  async onDisplayNameChange(displayName: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    this.isSavingProfile.set(true);
    try {
      await this.profileEdit.commitDisplayName({ user, displayName });
    } finally {
      this.isSavingProfile.set(false);
    }
  }

  async onAvatarSeedChange(avatarSeed: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    this.isSavingProfile.set(true);
    try {
      await this.profileEdit.commitAvatarSeed({ user, avatarSeed });
    } finally {
      this.isSavingProfile.set(false);
    }
  }
}
