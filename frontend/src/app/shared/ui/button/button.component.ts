import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [CommonModule, IconComponent],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [ngClass]="classes()"
      (click)="clicked.emit($event)"
    >
      @if (loading()) {
      <app-icon name="loader" [size]="iconSize()" class="animate-spin" />
      }
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  readonly clicked = output<MouseEvent>();

  readonly iconSize = computed(() => {
    switch (this.size()) {
      case 'xs':
        return 'xs' as const;
      case 'sm':
        return 'sm' as const;
      case 'lg':
        return 'lg' as const;
      case 'md':
      default:
        return 'md' as const;
    }
  });

  readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-highlight text-white hover:bg-highlight-dark focus:ring-highlight dark:bg-highlight-light dark:hover:bg-highlight',
      secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600',
      outline:
        'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-highlight dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
      success:
        'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-600',
      ghost:
        'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-slate-700',
    };

    const widthClass = this.fullWidth() ? 'w-full' : '';

    return [base, sizeClasses[this.size()], variantClasses[this.variant()], widthClass].join(' ');
  });
}
