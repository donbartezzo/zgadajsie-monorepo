import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { AvatarUser, UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { generateAvatarSeed } from '../../utils/avatar-seed.util';

@Component({
  selector: 'app-avatar-picker',
  imports: [UserAvatarComponent, ButtonComponent, IconComponent],
  templateUrl: './avatar-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPickerComponent {
  readonly user = input.required<AvatarUser>();
  readonly autoGenerate = input(false);

  readonly previewReady = output<string>();

  readonly previewSeed = signal<string | null>(null);

  readonly hasPreview = computed(() => this.previewSeed() !== null);

  readonly previewUser = computed((): AvatarUser | null => {
    const s = this.previewSeed();
    if (s === null) return null;
    return { ...this.user(), avatarSeed: s };
  });

  constructor() {
    effect(() => {
      if (this.autoGenerate() && this.previewSeed() === null) {
        this.generateNew();
      }
    });
  }

  generateNew(): void {
    const seed = generateAvatarSeed();
    this.previewSeed.set(seed);
    this.previewReady.emit(seed);
  }
}
