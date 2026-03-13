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
 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
 secondary:
 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-500',
 outline:
 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-primary-500',
 danger:
 'bg-danger-400 text-white hover:bg-danger-500 focus:ring-danger-400',
 success:
 'bg-success-400 text-white hover:bg-success-500 focus:ring-success-400',
 ghost:
 'text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-500',
 };

 const widthClass = this.fullWidth() ? 'w-full' : '';

 return [base, sizeClasses[this.size()], variantClasses[this.variant()], widthClass].join(' ');
 });
}
