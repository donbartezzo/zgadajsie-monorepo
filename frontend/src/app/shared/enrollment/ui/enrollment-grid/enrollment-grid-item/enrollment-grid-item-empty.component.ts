import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../../ui/icon/icon.component';
import { EnrollmentGridItemShellComponent } from './enrollment-grid-item-shell.component';

@Component({
  selector: 'app-enrollment-grid-item-empty',
  imports: [IconComponent, EnrollmentGridItemShellComponent],
  template: `
    @let _icon = resolvedIcon();

    <app-enrollment-grid-item-shell
      [buttonClass]="buttonClass()"
      [label]="resolvedLabel()"
      [nameClass]="nameClass()"
      (clicked)="clicked.emit()"
    >
      <div class="relative flex">
        <div [class]="avatarContainerClass()">
          <app-icon [name]="$any(_icon)" [size]="iconSize()" [class]="iconClass()" />
        </div>
      </div>
    </app-enrollment-grid-item-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridItemEmptyComponent {
  readonly icon = input<string | null>(null);
  readonly variant = input<'add' | 'free' | 'locked'>('free');
  readonly iconSize = input<'xs' | 'sm' | 'md' | 'lg'>('lg');
  readonly label = input<string | null>(null);
  readonly clicked = output<void>();

  readonly resolvedIcon = computed(() => {
    const icons = {
      add: 'user-plus',
      free: 'plus',
      locked: 'lock',
    };

    return this.icon() ?? icons[this.variant()];
  });

  readonly resolvedLabel = computed(() => {
    const labels = {
      add: 'Dodaj nowego',
      free: 'Wolne miejsce',
      locked: 'Zablokowane miejce',
    };

    return this.label() ?? labels[this.variant()];
  });

  readonly iconClass = computed(() => {
    const colors: Record<'add' | 'free' | 'locked', string> = {
      add: 'text-primary-400',
      free: 'text-primary-400',
      locked: 'text-warning-400',
    };

    return colors[this.variant()];
  });

  readonly nameClass = computed(() => {
    const colors: Record<'add' | 'free' | 'locked', string> = {
      add: 'text-primary-600',
      free: 'text-primary-600',
      locked: 'text-warning-600',
    };

    return colors[this.variant()];
  });

  readonly buttonClass = computed(() => {
    const base =
      'flex flex-col items-center w-full h-full p-1 rounded-xl transition-colors overflow-hidden' +
      ' hover:bg-neutral-50 focus:outline-hidden';

    const variants: Record<'add' | 'free' | 'locked', string> = {
      add: 'focus:ring-2 focus:ring-primary-200',
      free: 'focus:ring-2 focus:ring-primary-200',
      locked: 'focus:ring-2 focus:ring-warning-200',
    };

    return `${base} ${variants[this.variant()]}`;
  });

  readonly avatarContainerClass = computed(() => {
    const variants: Record<'add' | 'free' | 'locked', string> = {
      add: 'border-2 border-dashed border-primary-300 bg-primary-50/50',
      free: 'border-2 border-dashed border-primary-200 bg-primary-50',
      locked: 'border-2 border-dashed border-warning-300 bg-warning-50',
    };

    return `w-18 h-18 rounded-xl flex items-center justify-center ${variants[this.variant()]}`;
  });
}
