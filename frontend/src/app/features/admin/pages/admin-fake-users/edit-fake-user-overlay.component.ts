import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { UserProfileCardComponent } from '../../../../shared/user/ui/user-profile-card/user-profile-card.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

interface FakeUser {
  id: string;
  displayName: string;
  email: string;
  avatarSeed: string | null;
  gender: string | null;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-edit-fake-user-overlay',
  imports: [ModalComponent, UserProfileCardComponent],
  template: `
    <app-modal (closed)="closed.emit()">
      <div class="p-6 w-full max-w-md">
        <h2 class="text-xl font-bold text-neutral-900 mb-6">Edytuj fake usera</h2>

        <app-user-profile-card
          [user]="user()"
          [canEditName]="true"
          [canEditAvatar]="true"
          [isSaving]="saving()"
          [variant]="'overlay'"
          [context]="'profile'"
          (displayNameChange)="onDisplayNameChange($event)"
          (avatarSeedChange)="onAvatarSeedChange($event)"
          (cancelled)="onCancelled()"
        />
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFakeUserOverlayComponent {
  private readonly http = inject(HttpClient);
  private readonly snackbar = inject(SnackbarService);
  private readonly apiUrl = environment.apiUrl;

  readonly user = input.required<FakeUser>();
  readonly closed = output<void>();

  readonly saving = signal(false);

  async onDisplayNameChange(value: string): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.put<FakeUser>(`${this.apiUrl}/admin/fake-users/${this.user().id}`, {
          displayName: value,
        }),
      );
      this.snackbar.show('Nazwa zaktualizowana', 'success');
      this.closed.emit();
    } catch {
      this.snackbar.show('Nie udało się zaktualizować nazwy', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarSeedChange(seed: string): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.put<FakeUser>(`${this.apiUrl}/admin/fake-users/${this.user().id}`, {
          avatarSeed: seed ?? undefined,
        }),
      );
      this.snackbar.show('Avatar zaktualizowany', 'success');
      this.closed.emit();
    } catch {
      this.snackbar.show('Nie udało się zaktualizować avatara', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  onCancelled(): void {
    this.closed.emit();
  }
}
