import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUrl } from '../../../types';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'rounded';

@Component({
  selector: 'app-user-avatar',
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex shrink-0">
      <!-- Avatar container -->
      <div
        class="relative inline-flex items-center justify-center overflow-hidden"
        [ngClass]="[sizeClass(), shapeClass()]"
      >
        @if (hasAvatar() && showImage()) {
          <img
            [src]="avatarUrl()"
            [alt]="displayName()"
            class="object-cover w-full h-full"
            [ngClass]="shapeClass()"
            (error)="onImageError()"
          />
        } @else {
          <div
            class="flex items-center justify-center font-semibold text-white w-full h-full"
            [ngClass]="[bgClass(), shapeClass()]"
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
  readonly avatarUrl = input<AvatarUrl>(null);
  readonly displayName = input('');
  readonly size = input<AvatarSize>('md');
  readonly shape = input<AvatarShape>('rounded');

  readonly hasAvatar = computed(() => {
    const url = this.avatarUrl();
    return url !== null && url !== undefined && url.trim() !== '';
  });

  readonly showImage = signal(true);

  readonly initials = computed(() => {
    const name = this.displayName();
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
    const name = this.displayName();
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  });

  onImageError(): void {
    this.showImage.set(false);
  }
}
