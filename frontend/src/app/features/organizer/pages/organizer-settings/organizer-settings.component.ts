import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AccountContentComponent } from '../../../../shared/ui/account-nav-rail/account-content.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { DEFAULT_WELCOME_MESSAGE } from '@zgadajsie/shared';

@Component({
  selector: 'app-organizer-settings',
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    AccountContentComponent,
  ],
  templateUrl: './organizer-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerSettingsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(SnackbarService);

  editWelcomeMessage = '';
  editWelcomeMessageEnabled = true;
  readonly savingWelcome = signal(false);
  readonly defaultWelcomeMessage = DEFAULT_WELCOME_MESSAGE;

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.editWelcomeMessage = user.welcomeMessage ?? '';
      this.editWelcomeMessageEnabled = user.welcomeMessageEnabled ?? true;
    }
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
}
