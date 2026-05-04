import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AvatarUser, UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ModalService } from '../../../ui/modal/modal.service';
import { AvatarConfirmModalComponent } from '../../../../features/user/overlays/avatar-confirm-modal.component';

@Component({
  selector: 'app-avatar-picker',
  imports: [UserAvatarComponent, ButtonComponent, IconComponent],
  templateUrl: './avatar-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerComponent {
  private readonly modalService = inject(ModalService);

  readonly user = input.required<AvatarUser>();

  readonly avatarConfirmed = output<string>();

  readonly previewSeed = signal<string | null>(null);

  readonly hasPreview = computed(() => this.previewSeed() !== null);

  readonly previewUser = computed((): AvatarUser | null => {
    const s = this.previewSeed();
    if (s === null) return null;
    return { ...this.user(), avatarSeed: s };
  });

  readonly previewDifferentFromCurrent = computed(() => {
    return this.previewSeed() !== (this.user().avatarSeed ?? null);
  });

  generateNew(): void {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const seed = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    this.previewSeed.set(seed);
  }

  openConfirmModal(): void {
    const newSeed = this.previewSeed();
    if (!newSeed) return;

    const newUser: AvatarUser = { ...this.user(), avatarSeed: newSeed };

    this.modalService.open(AvatarConfirmModalComponent, {
      currentUser: this.user(),
      newUser,
      onConfirmed: (confirmedSeed: string) => {
        this.previewSeed.set(null);
        this.avatarConfirmed.emit(confirmedSeed);
      },
    });
  }
}
