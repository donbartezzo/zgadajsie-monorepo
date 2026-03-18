import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUrl } from '../../types';
import { IconComponent, IconName } from '../../../core/icons/icon.component';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'rounded';
export type StatusIndicator = 'success' | 'warning' | 'danger' | 'info' | 'pending' | null;

@Component({
  selector: 'app-user-avatar',
  imports: [CommonModule, IconComponent],
  template: `
    <div class="relative inline-flex flex-col items-center shrink-0">
      <!-- Avatar container -->
      <div
        class="relative inline-flex items-center justify-center overflow-hidden"
        [ngClass]="[sizeClass(), shapeClass()]"
      >
        @if (hasAvatar()) {
        <img
          [src]="avatarUrl()"
          [alt]="displayName()"
          class="object-cover w-full h-full"
          [ngClass]="shapeClass()"
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

      <!-- Status indicators (icons below avatar, styled like app-button icon variant) -->
      @if (statusIndicators().length > 0) {
      <div class="flex items-center justify-center gap-0.5 -mt-2 relative z-10">
        @for (indicator of statusIndicators(); track indicator.type) {
        <span
          class="inline-flex items-center justify-center rounded-lg shadow-sm"
          [ngClass]="indicatorClass(indicator.type)"
          [title]="indicator.tooltip"
        >
          <app-icon [name]="$any(indicator.icon)" [size]="indicatorIconSize()" />
        </span>
        }
      </div>
      }

      <!-- Legacy: isNew indicator -->
      @if (isNew() && statusIndicators().length === 0) {
      <span
        class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success-400 rounded-full border-2 border-white"
      ></span>
      }

      <!-- Legacy: rank badge -->
      @if (rank()) {
      <span
        class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1 rounded-full bg-warning-50 text-warning-400 whitespace-nowrap"
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
  readonly shape = input<AvatarShape>('rounded');
  readonly rank = input<string | null>(null);
  readonly isNew = input(false);
  readonly status = input<StatusIndicator>(null);
  readonly showPaymentWarning = input(false);
  readonly showPending = input(false);

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

  readonly statusIndicators = computed(() => {
    const indicators: { type: StatusIndicator; icon: IconName; tooltip: string }[] = [];

    if (this.showPaymentWarning()) {
      indicators.push({ type: 'warning', icon: 'credit-card', tooltip: 'Oczekuje na płatność' });
    }
    if (this.showPending()) {
      indicators.push({ type: 'pending', icon: 'clock', tooltip: 'Oczekuje na zatwierdzenie' });
    }
    if (this.status() === 'success') {
      indicators.push({ type: 'success', icon: 'check', tooltip: 'Potwierdzony' });
    }
    if (this.status() === 'danger') {
      indicators.push({ type: 'danger', icon: 'x', tooltip: 'Odrzucony' });
    }

    return indicators;
  });

  indicatorClass(type: StatusIndicator): string {
    // Styled like app-button icon variant (pastel bg + darker icon)
    const base = 'w-5 h-5 border border-white';
    const colors: Record<string, string> = {
      success: `${base} bg-success-50 text-success-600`,
      warning: `${base} bg-warning-50 text-warning-600`,
      danger: `${base} bg-danger-50 text-danger-600`,
      info: `${base} bg-info-50 text-info-600`,
      pending: `${base} bg-neutral-100 text-neutral-600`,
    };
    return colors[type ?? 'info'] ?? colors['info'];
  }

  indicatorIconSize(): 'xs' | 'sm' {
    return 'xs';
  }
}
