import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName, IconSize } from '../../../core/icons/icon.component';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'outline-primary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'ghost'
  | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconPosition = 'left' | 'right';

@Component({
  selector: 'app-button',
  imports: [CommonModule, IconComponent],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [ngClass]="classes()"
      [attr.aria-label]="ariaLabel() || null"
      (click)="clicked.emit($event)"
    >
      @if (loading()) {
      <app-icon name="loader" [size]="iconSizeValue()" class="animate-spin" />
      } @else { @if (icon() && iconPosition() === 'left') {
      <app-icon [name]="icon()!" [size]="iconSizeValue()" />
      }
      <ng-content />
      @if (icon() && iconPosition() === 'right') {
      <app-icon [name]="icon()!" [size]="iconSizeValue()" />
      } }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly icon = input<IconName>();
  readonly iconPosition = input<IconPosition>('left');
  readonly iconOnly = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly ariaLabel = input<string>('');

  readonly clicked = output<MouseEvent>();

  readonly iconSizeValue = computed((): IconSize => {
    const sizeMap: Record<ButtonSize, IconSize> = {
      xs: 'xs',
      sm: 'sm',
      md: 'sm',
      lg: 'md',
    };
    return sizeMap[this.size()];
  });

  readonly classes = computed(() => {
    const isIconOnly = this.iconOnly() || (this.icon() && !this.hasContent());
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Kwadratowe rozmiary dla icon-only, prostokątne dla tekstu
    const sizeClasses: Record<ButtonSize, string> = isIconOnly
      ? {
          xs: 'w-7 h-7 text-xs',
          sm: 'w-8 h-8 text-sm',
          md: 'w-10 h-10 text-sm',
          lg: 'w-12 h-12 text-base',
        }
      : {
          xs: 'px-2 py-1 text-xs gap-1',
          sm: 'px-3 py-1.5 text-sm gap-1.5',
          md: 'px-4 py-2.5 text-sm gap-2',
          lg: 'px-5 py-3 text-base gap-2',
        };

    // Pastelowe tło + ciemna ikona/tekst (styl sticky-mobile "Colors 2.0 Upgrade")
    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary-100 text-primary-600 hover:bg-primary-200 focus:ring-primary-300',
      secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-300',
      outline:
        'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-300',
      'outline-primary':
        'border border-primary-300 bg-white text-primary-600 hover:bg-primary-50 focus:ring-primary-300',
      danger: 'bg-danger-50 text-danger-500 hover:bg-danger-100 focus:ring-danger-300',
      success: 'bg-success-50 text-success-600 hover:bg-success-100 focus:ring-success-300',
      warning: 'bg-warning-50 text-warning-600 hover:bg-warning-100 focus:ring-warning-300',
      info: 'bg-info-50 text-info-600 hover:bg-info-100 focus:ring-info-300',
      neutral: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 focus:ring-neutral-300',
      ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-300',
      link: 'bg-transparent text-primary-600 underline hover:text-primary-700 focus:ring-primary-300',
    };

    const widthClass = this.fullWidth() ? 'w-full' : '';

    return [base, sizeClasses[this.size()], variantClasses[this.variant()], widthClass]
      .filter(Boolean)
      .join(' ');
  });

  private hasContent(): boolean {
    return !this.iconOnly();
  }
}
