import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { AccountRailSlotComponent } from '../../../../shared/ui/account-nav-rail/account-rail-slot.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { UserProfileCardComponent } from '../../../../shared/user/ui/user-profile-card/user-profile-card.component';
import { ParticipantStatsComponent } from '../../../../shared/user/ui/participant-stats/participant-stats.component';
import { SocialLinksEditorComponent } from '../../../../shared/user/ui/social-links-editor/social-links-editor.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { DisciplineProfileService } from '../../../../core/services/discipline-profile.service';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { UserProfileEditService } from '../../../../shared/user/services/user-profile-edit.service';
import { isSupportedDonationUrl } from '../../../../shared/utils/support-url.utils';
import { DisciplineProfile, ParticipantStats } from '../../../../shared/types';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IconComponent,
    ButtonComponent,
    CardComponent,
    UserProfileCardComponent,
    ParticipantStatsComponent,
    SocialLinksEditorComponent,
    AccountRailSlotComponent,
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly disciplineProfileService = inject(DisciplineProfileService);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly snackbar = inject(SnackbarService);
  private readonly profileEdit = inject(UserProfileEditService);

  newPassword = '';
  currentPassword = '';
  editDonationUrl = '';
  readonly saving = signal(false);
  readonly donationUrlError = signal<string | null>(null);
  readonly isSavingProfile = signal(false);

  readonly stats = signal<ParticipantStats | null>(null);
  readonly disciplineProfiles = signal<DisciplineProfile[]>([]);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.editDonationUrl = user.donationUrl ?? '';
    }
    this.loadStats();
    this.loadDisciplineProfiles();
  }

  private loadStats(): void {
    this.disciplineProfileService.getMyStats().subscribe({
      next: (stats) => this.stats.set(stats),
    });
  }

  private loadDisciplineProfiles(): void {
    this.disciplineProfileService.getMine().subscribe({
      next: (profiles) => this.disciplineProfiles.set(profiles),
    });
  }

  onSocialLinksSave(socialLinks: string[]): void {
    this.userService.updateProfile({ socialLinks }).subscribe({
      next: (updatedUser) => {
        this.auth.updateUser(updatedUser);
        this.snackbar.success('Linki społecznościowe zapisane');
      },
      error: (err) => this.snackbar.error(err?.error?.message || 'Błąd zapisu linków'),
    });
  }

  editDisciplineProfile(profile: DisciplineProfile): void {
    this.overlays.openDisciplineProfile(
      {
        disciplineSlug: profile.disciplineSlug,
        initial: { levelSlug: profile.levelSlug, bio: profile.bio },
        submitLabel: 'Zapisz',
      },
      (value) => {
        this.disciplineProfileService.upsert(profile.disciplineSlug, value).subscribe({
          next: () => {
            this.overlays.close();
            this.loadDisciplineProfiles();
            this.snackbar.success('Profil dyscypliny zapisany');
          },
          error: (err) =>
            this.snackbar.error(err?.error?.message || 'Nie udało się zapisać profilu'),
        });
      },
    );
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
