import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUrl } from '../../types';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-user-avatar',
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex items-center justify-center shrink-0" [ngClass]="sizeClass()">
      @if (hasAvatar()) {
      <img
        [src]="avatarUrl()"
        [alt]="displayName()"
        class="rounded-full object-cover w-full h-full"
      />
      } @else {
      <div
        class="rounded-full flex items-center justify-center font-semibold text-white w-full h-full"
        [ngClass]="bgClass()"
      >
        {{ initials() }}
      </div>
      } @if (isNew()) {
      <span
        class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"
      ></span>
      } @if (rank()) {
      <span
        class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1 rounded-full bg-yellow-400 text-yellow-900 whitespace-nowrap"
        >{{ rank() }}</span
      >
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarComponent {
  readonly avatarUrl = input<AvatarUrl>(null);
  readonly displayName = input('');
  readonly size = input<AvatarSize>('md');
  readonly rank = input<string | null>(null);
  readonly isNew = input(false);

  readonly hasAvatar = computed(() => {
    const url = this.avatarUrl();
    return url !== null && url !== undefined && url.trim() !== '';
  });

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
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
    };
    return sizes[this.size()];
  });

  readonly bgClass = computed(() => {
    const colors = [
      'bg-highlight',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-rose-500',
    ];
    const name = this.displayName();
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  });
}
