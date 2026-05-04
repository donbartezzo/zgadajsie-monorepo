import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ModalService } from '../../../shared/ui/modal/modal.service';
import {
  AvatarUser,
  UserAvatarComponent,
} from '../../../shared/user/ui/user-avatar/user-avatar.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-avatar-confirm-modal',
  imports: [ModalComponent, UserAvatarComponent, IconComponent],
  template: `
    <app-modal (closed)="close()">
      <div class="space-y-4">
        <div>
          <h2 class="text-base font-bold text-neutral-900">Zmień avatar</h2>
          <p class="mt-1 text-sm text-neutral-500 leading-relaxed">
            Czy na pewno chcesz zmienić swój avatar? Poprzedni avatar może być już niedostępny w
            przyszłości.
          </p>
        </div>

        <!-- Porównanie: stary vs nowy -->
        <div class="flex items-center justify-center gap-8">
          <div class="flex flex-col items-center gap-2">
            <p class="text-xs font-medium text-neutral-500">Obecny</p>
            <app-user-avatar [user]="currentUser()" size="xl" shape="rounded" />
          </div>

          <app-icon name="arrow-right" size="lg" color="neutral" />

          <div class="flex flex-col items-center gap-2">
            <p class="text-xs font-medium text-primary-600">Nowy</p>
            <app-user-avatar [user]="newUser()" size="xl" shape="rounded" />
          </div>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            (click)="close()"
          >
            Anuluj
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            [disabled]="saving()"
            (click)="confirm()"
          >
            @if (saving()) {
              Zapisywanie...
            } @else {
              Potwierdź zmianę
            }
          </button>
        </div>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarConfirmModalComponent {
  private readonly modalService = inject(ModalService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly currentUser = input.required<AvatarUser>();
  readonly newUser = input.required<AvatarUser>();
  readonly onConfirmed = input<(seed: string) => void>();

  readonly saving = signal(false);

  close(): void {
    this.modalService.close();
  }

  async confirm(): Promise<void> {
    this.saving.set(true);
    const newSeed = this.newUser().avatarSeed ?? null;
    try {
      const updatedUser = await firstValueFrom(
        this.userService.updateProfile({ avatarSeed: newSeed }),
      );
      this.auth.updateUser(updatedUser);
      this.onConfirmed()?.(newSeed ?? '');
      this.snackbar.success('Avatar zmieniony');
      this.modalService.close();
    } catch {
      this.snackbar.error('Nie udało się zmienić avatara');
    } finally {
      this.saving.set(false);
    }
  }
}
