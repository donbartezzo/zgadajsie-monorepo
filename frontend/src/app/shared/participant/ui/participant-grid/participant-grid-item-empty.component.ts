import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../ui/icon/icon.component';

@Component({
  selector: 'app-participant-grid-item-empty',
  imports: [IconComponent],
  template: `
    @let _icon = resolvedIcon();
    @let _label = resolvedLabel();

    <div class="w-24 h-24 rounded-xl transition-colors">
      <button type="button" [class]="buttonClass()" (click)="clicked.emit()">
        <div class="relative flex flex-col items-center justify-center flex-1">
          <div class="relative">
            <div [class]="avatarContainerClass()">
              <app-icon [name]="$any(_icon)" [size]="iconSize()" [class]="iconClass()" />
            </div>
          </div>

          <span
            [class]="
              'text-[9px] text-center leading-tight mt-1 w-full line-clamp-2 h-[2.6em] flex-shrink-0 ' +
              nameClass()
            "
          >
            {{ _label }}
          </span>
        </div>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantGridItemEmptyComponent {
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
      'flex flex-col items-center w-full h-full p-2 rounded-xl transition-colors' +
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

    return `w-14 h-14 rounded-xl flex items-center justify-center ${variants[this.variant()]}`;
  });
}
