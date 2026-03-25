import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName, IconSize } from '../icon/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';

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
export type ButtonAppearance = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonAlignment = 'start' | 'center' | 'end';

@Component({
  selector: 'app-button',
  imports: [CommonModule, IconComponent],
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly appearance = input<ButtonAppearance | null>(null);
  readonly color = input<SemanticColor | null>(null);
  readonly variant = input<ButtonVariant | null>(null);
  readonly size = input<ButtonSize>('md');
  readonly iconLeft = input<IconName>();
  readonly iconLeftBackground = input(false);
  readonly iconRight = input<IconName>();
  readonly iconRightBackground = input(false);
  readonly alignment = input<ButtonAlignment>('center');
  readonly iconOnly = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly ariaLabel = input<string>('');

  readonly clicked = output<MouseEvent>();

  readonly showLeftIcon = computed(() => !this.loading() && !!this.iconLeft());

  readonly showRightIcon = computed(() => !this.loading() && !!this.iconRight());

  readonly iconSizeValue = computed((): IconSize => {
    const sizeMap: Record<ButtonSize, IconSize> = {
      xs: 'xs',
      sm: 'sm',
      md: 'sm',
      lg: 'md',
    };
    return sizeMap[this.size()];
  });

  readonly resolvedAppearance = computed<ButtonAppearance>(() => {
    const appearance = this.appearance();
    if (appearance) {
      return appearance;
    }

    switch (this.variant()) {
      case 'outline':
      case 'outline-primary':
        return 'outline';
      case 'ghost':
        return 'ghost';
      case 'link':
        return 'link';
      default:
        return 'solid';
    }
  });

  readonly resolvedColor = computed<SemanticColor>(() => {
    const color = this.color();
    if (color) {
      return color;
    }

    switch (this.variant()) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return 'neutral';
      case 'outline-primary':
      case 'link':
      case 'primary':
        return 'primary';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      case 'info':
        return 'info';
      case 'neutral':
        return 'neutral';
      default:
        return 'primary';
    }
  });

  readonly iconLeftBackgroundClass = computed(() => {
    const color = this.resolvedColor();
    const appearance = this.resolvedAppearance();

    if (appearance === 'soft') {
      return SEMANTIC_COLOR_CLASSES.surfaceStrong[color];
    }

    if (appearance === 'solid') {
      return `bg-white/20`;
    }

    return SEMANTIC_COLOR_CLASSES.surface[color];
  });

  readonly iconLeftColorClass = computed(() => {
    if (this.resolvedAppearance() === 'solid') {
      return 'text-white';
    }
    return SEMANTIC_COLOR_CLASSES.textStrong[this.resolvedColor()];
  });

  readonly iconRightBackgroundClass = computed(() => {
    const color = this.resolvedColor();
    const appearance = this.resolvedAppearance();

    if (appearance === 'soft') {
      return SEMANTIC_COLOR_CLASSES.surfaceStrong[color];
    }

    if (appearance === 'solid') {
      return `bg-white/20`;
    }

    return SEMANTIC_COLOR_CLASSES.surface[color];
  });

  readonly iconRightColorClass = computed(() => {
    if (this.resolvedAppearance() === 'solid') {
      return 'text-white';
    }
    return SEMANTIC_COLOR_CLASSES.textStrong[this.resolvedColor()];
  });

  readonly classes = computed(() => {
    const isIconOnly =
      this.iconOnly() || ((this.iconLeft() || this.iconRight()) && !this.hasContent());
    const alignmentMap: Record<ButtonAlignment, string> = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    };
    const justifyClass = isIconOnly ? 'justify-center' : alignmentMap[this.alignment()];
    const base = `flex items-center ${justifyClass} font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`;

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

    const solidClasses: Record<SemanticColor, string> = {
      primary:
        'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-300 shadow-sm hover:shadow',
      success:
        'bg-success-400 text-white hover:bg-success-500 focus:ring-success-300 shadow-sm hover:shadow',
      danger:
        'bg-danger-400 text-white hover:bg-danger-500 focus:ring-danger-300 shadow-sm hover:shadow',
      warning:
        'bg-warning-400 text-white hover:bg-warning-500 focus:ring-warning-300 shadow-sm hover:shadow',
      info: 'bg-info-400 text-white hover:bg-info-500 focus:ring-info-300 shadow-sm hover:shadow',
      neutral:
        'bg-neutral-500 text-white hover:bg-neutral-600 focus:ring-neutral-300 shadow-sm hover:shadow',
    };

    const softClasses: Record<SemanticColor, string> = {
      primary: 'bg-primary-100 text-primary-600 hover:bg-primary-200 focus:ring-primary-300',
      success: 'bg-success-50 text-success-600 hover:bg-success-100 focus:ring-success-300',
      danger: 'bg-danger-50 text-danger-500 hover:bg-danger-100 focus:ring-danger-300',
      warning: 'bg-warning-50 text-warning-600 hover:bg-warning-100 focus:ring-warning-300',
      info: 'bg-info-50 text-info-600 hover:bg-info-100 focus:ring-info-300',
      neutral: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-300',
    };

    const outlineClasses: Record<SemanticColor, string> = {
      primary:
        'border border-primary-300 bg-white text-primary-600 hover:bg-primary-50 focus:ring-primary-300',
      success:
        'border border-success-200 bg-white text-success-600 hover:bg-success-50 focus:ring-success-300',
      danger:
        'border border-danger-200 bg-white text-danger-500 hover:bg-danger-50 focus:ring-danger-300',
      warning:
        'border border-warning-200 bg-white text-warning-600 hover:bg-warning-50 focus:ring-warning-300',
      info: 'border border-info-200 bg-white text-info-600 hover:bg-info-50 focus:ring-info-300',
      neutral:
        'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-300',
    };

    const ghostClasses: Record<SemanticColor, string> = {
      primary: 'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-300',
      success: 'bg-transparent text-success-600 hover:bg-success-50 focus:ring-success-300',
      danger: 'bg-transparent text-danger-500 hover:bg-danger-50 focus:ring-danger-300',
      warning: 'bg-transparent text-warning-600 hover:bg-warning-50 focus:ring-warning-300',
      info: 'bg-transparent text-info-600 hover:bg-info-50 focus:ring-info-300',
      neutral: 'bg-transparent text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-300',
    };

    const linkClasses: Record<SemanticColor, string> = {
      primary: 'bg-transparent text-primary-600 underline hover:opacity-80 focus:ring-primary-300',
      success: 'bg-transparent text-success-600 underline hover:opacity-80 focus:ring-success-300',
      danger: 'bg-transparent text-danger-500 underline hover:opacity-80 focus:ring-danger-300',
      warning: 'bg-transparent text-warning-600 underline hover:opacity-80 focus:ring-warning-300',
      info: 'bg-transparent text-info-600 underline hover:opacity-80 focus:ring-info-300',
      neutral: 'bg-transparent text-neutral-600 underline hover:opacity-80 focus:ring-neutral-300',
    };

    const appearanceClasses: Record<ButtonAppearance, Record<SemanticColor, string>> = {
      solid: solidClasses,
      soft: softClasses,
      outline: outlineClasses,
      ghost: ghostClasses,
      link: linkClasses,
    };

    const widthClass = this.fullWidth() ? 'w-full' : '';
    const appearance = this.resolvedAppearance();
    const color = this.resolvedColor();

    return [base, sizeClasses[this.size()], appearanceClasses[appearance][color], widthClass]
      .filter(Boolean)
      .join(' ');
  });

  private hasContent(): boolean {
    return !this.iconOnly();
  }
}
