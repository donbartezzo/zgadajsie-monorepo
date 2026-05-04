import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';
import type { AvatarUser } from '../../../types';

export type { AvatarUser };
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'rounded';

@Component({
  selector: 'app-user-avatar',
  template: `
    <div class="relative inline-flex shrink-0">
      <div
        [class]="
          'relative inline-flex items-center justify-center overflow-hidden ' +
          sizeClass() +
          ' ' +
          shapeClass()
        "
      >
        @if (pixelArtDataUri()) {
          <img
            [src]="pixelArtDataUri()"
            [alt]="user()?.displayName ?? ''"
            [class]="'object-cover w-full h-full ' + shapeClass()"
          />
        } @else {
          <div
            [class]="
              'flex items-center justify-center font-semibold text-white w-full h-full ' +
              bgClass() +
              ' ' +
              shapeClass()
            "
          >
            {{ initials() }}
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarComponent {
  readonly user = input<AvatarUser | null>(null);
  readonly size = input<AvatarSize>('md');
  readonly shape = input<AvatarShape>('rounded');

  readonly pixelArtDataUri = computed(() => {
    const u = this.user();
    if (!u?.id) return null;
    const seed = u.id + (u.avatarSeed ?? '');
    const svg = createAvatar(pixelArt, { seed }).toString();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  readonly initials = computed(() => {
    const name = this.user()?.displayName ?? '';
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  });

  readonly sizeClass = computed(() => {
    const sizes: Record<AvatarSize, string> = {
      xs: 'w-6 h-6 text-[10px]',
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-14 h-14 text-base',
      xl: 'w-18 h-18 text-lg',
      '2xl': 'w-24 h-24 text-xl',
    };
    return sizes[this.size()];
  });

  readonly shapeClass = computed(() => {
    return this.shape() === 'circle' ? 'rounded-full' : 'rounded-xl';
  });

  readonly bgClass = computed(() => {
    const colors = [
      'bg-primary-500',
      'bg-success-400',
      'bg-info-300',
      'bg-warning-300',
      'bg-primary-400',
      'bg-mint-500',
      'bg-info-400',
      'bg-danger-300',
    ];
    const name = this.user()?.displayName ?? '';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  });
}
