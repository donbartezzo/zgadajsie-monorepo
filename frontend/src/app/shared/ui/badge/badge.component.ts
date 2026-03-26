import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SemanticColor } from '../../types/colors';
import { Muted } from '../../types';

export type BadgeVariant = 'solid' | 'soft' | 'outline' | 'ghost';
export type BadgeSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'app-badge',
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('soft');
  readonly color = input<SemanticColor>('neutral');
  readonly size = input<BadgeSize>('sm');
  readonly muted = input<Muted>();

  readonly classes = computed(() => {
    const base = 'inline-flex items-center font-medium rounded-full transition-colors';

    const sizeClasses: Record<BadgeSize, string> = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-1.5 text-sm',
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

    const outlineClasses: Record<SemanticColor, string> = {
      primary: 'border border-primary-300 bg-white text-primary-600',
      success: 'border border-success-200 bg-white text-success-600',
      danger: 'border border-danger-200 bg-white text-danger-500',
      warning: 'border border-warning-200 bg-white text-warning-600',
      info: 'border border-info-200 bg-white text-info-600',
      neutral: 'border border-neutral-200 bg-white text-neutral-700',
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

    let classes = [base, sizeClasses[this.size()], variantClasses[variant][color]]
      .filter(Boolean)
      .join(' ');

    // Apply muted opacity
    if (mutedValue === 'light') {
      classes += ' opacity-50';
    } else if (mutedValue === 'heavy') {
      classes += ' opacity-30';
    }

    return classes;
  });
}
