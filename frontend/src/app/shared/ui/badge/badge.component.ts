import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { SemanticColor } from '../../types/colors';
import { Muted } from '../../types';

export type BadgeVariant = 'solid' | 'soft' | 'outline' | 'ghost';
export type BadgeSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'app-badge',
  imports: [CommonModule, IconComponent],
  templateUrl: './badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('soft');
  readonly color = input<SemanticColor>('neutral');
  readonly size = input<BadgeSize>('sm');
  readonly muted = input<Muted>();
  readonly icon = input<string>();
  readonly square = input(false);
  readonly borderColor = input<SemanticColor | null>(null);
  readonly hasShadow = input(false);

  readonly classes = computed(() => {
    const base = 'inline-flex items-center gap-1 font-medium rounded-full transition-colors';

    const sizeClasses: Record<BadgeSize, string> = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-1.5 text-sm',
    };

    const squareSizeClasses: Record<BadgeSize, string> = {
      xs: 'p-1 text-[10px]',
      sm: 'p-1.5 text-xs',
      md: 'p-2 text-sm',
    };

    const solidClasses: Record<SemanticColor, string> = {
      primary: 'bg-primary-500 text-white',
      success: 'bg-success-400 text-white',
      danger: 'bg-danger-400 text-white',
      warning: 'bg-warning-400 text-white',
      info: 'bg-info-400 text-white',
      neutral: 'bg-neutral-500 text-white',
    };

    const softClasses: Record<SemanticColor, string> = {
      primary: 'bg-primary-100 text-primary-700',
      success: 'bg-success-50 text-success-600',
      danger: 'bg-danger-50 text-danger-500',
      warning: 'bg-warning-50 text-warning-600',
      info: 'bg-info-50 text-info-600',
      neutral: 'bg-neutral-100 text-neutral-700',
    };

    const borderColors: Record<SemanticColor, string> = {
      primary: 'border-primary-300',
      success: 'border-success-200',
      danger: 'border-danger-200',
      warning: 'border-warning-200',
      info: 'border-info-200',
      neutral: 'border-neutral-200',
    };

    const outlineClasses: Record<SemanticColor, string> = {
      primary: `${borderColors.primary} bg-white text-primary-600`,
      success: `${borderColors.success} bg-white text-success-600`,
      danger: `${borderColors.danger} bg-white text-danger-500`,
      warning: `${borderColors.warning} bg-white text-warning-600`,
      info: `${borderColors.info} bg-white text-info-600`,
      neutral: `${borderColors.neutral} bg-white text-neutral-700`,
    };

    const ghostClasses: Record<SemanticColor, string> = {
      primary: 'bg-transparent text-primary-600',
      success: 'bg-transparent text-success-600',
      danger: 'bg-transparent text-danger-500',
      warning: 'bg-transparent text-warning-600',
      info: 'bg-transparent text-info-600',
      neutral: 'bg-transparent text-neutral-600',
    };

    const variantClasses: Record<BadgeVariant, Record<SemanticColor, string>> = {
      solid: solidClasses,
      soft: softClasses,
      outline: outlineClasses,
      ghost: ghostClasses,
    };

    const variant = this.variant();
    const color = this.color();
    const mutedValue = this.muted();
    const borderColorValue = this.borderColor();
    const hasShadowValue = this.hasShadow();

    const activeSizeClasses = this.square() ? squareSizeClasses : sizeClasses;

    let classes = [base, activeSizeClasses[this.size()], variantClasses[variant][color]]
      .filter(Boolean)
      .join(' ');

    if (hasShadowValue) {
      classes += ' shadow-md';
    }

    classes += ` border`;

    // Add border for all variants except outline (which already has it)
    if (variant !== 'outline') {
      if (borderColorValue) {
        classes += ` ${borderColors[borderColorValue]}`;
      } else {
        classes += ' border-transparent';
      }
    }

    // Apply muted opacity
    if (mutedValue === 'light') {
      classes += ' opacity-50';
    } else if (mutedValue === 'heavy') {
      classes += ' opacity-30';
    }

    return classes;
  });
}
