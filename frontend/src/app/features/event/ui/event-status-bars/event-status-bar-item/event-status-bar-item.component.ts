import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../../../../shared/types/colors';
import { BottomOverlaysService } from '../../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';

export interface EventStatusBarConfig {
  id: string;
  color: SemanticColor;
  icon: IconName;
  title: string;
  subtitle: string;
  bgClass: string;
  borderClass: string;
  showInfoButton?: boolean;
  actionButton?: {
    label: string;
    color?: SemanticColor;
  };
}

export type EventStatusBarVariant = 'inline' | 'sticky';

interface VariantClasses {
  wrapper: string;
  inner: string;
  gap: string;
  iconSize: 'xs' | 'sm' | 'md';
  titleSize: string;
  actionsGap: string;
  infoButtonBase: string;
  actionButtonSize: 'xs' | 'sm';
  infoButtonSize: 'xs' | 'sm';
  showTestId: boolean;
}

interface AccentClasses {
  icon: string;
  title: string;
  subtitle: string;
  infoButton: string;
}

const VARIANTS: Record<EventStatusBarVariant, VariantClasses> = {
  inline: {
    wrapper: 'relative z-10 overflow-hidden -mx-4',
    inner: 'px-4 py-3',
    gap: 'gap-3',
    iconSize: 'md',
    titleSize: 'text-md',
    actionsGap: 'gap-1.5',
    infoButtonBase:
      'flex items-center justify-center w-7 h-7 rounded-full border transition-colors',
    actionButtonSize: 'sm',
    infoButtonSize: 'sm',
    showTestId: true,
  },
  sticky: {
    wrapper: '',
    inner: 'px-3 py-1',
    gap: 'gap-3',
    iconSize: 'xs',
    titleSize: 'text-xs',
    actionsGap: 'gap-1',
    infoButtonBase:
      'flex items-center justify-center w-6 h-6 rounded-full border transition-colors',
    actionButtonSize: 'xs',
    infoButtonSize: 'xs',
    showTestId: false,
  },
};

const ACCENT_VARIANTS: Record<SemanticColor, AccentClasses> = {
  primary: {
    icon: SEMANTIC_COLOR_CLASSES.textStrong.primary,
    title: SEMANTIC_COLOR_CLASSES.textStrong.primary,
    subtitle: `${SEMANTIC_COLOR_CLASSES.textStrong.primary} opacity-80`,
    infoButton: [
      SEMANTIC_COLOR_CLASSES.border.primary,
      SEMANTIC_COLOR_CLASSES.surface.primary,
      SEMANTIC_COLOR_CLASSES.textStrong.primary,
      'hover:bg-primary-100',
    ].join(' '),
  },
  success: {
    icon: SEMANTIC_COLOR_CLASSES.textStrong.success,
    title: SEMANTIC_COLOR_CLASSES.textStrong.success,
    subtitle: `${SEMANTIC_COLOR_CLASSES.textStrong.success} opacity-80`,
    infoButton: [
      SEMANTIC_COLOR_CLASSES.border.success,
      SEMANTIC_COLOR_CLASSES.surface.success,
      SEMANTIC_COLOR_CLASSES.textStrong.success,
      'hover:bg-success-100',
    ].join(' '),
  },
  danger: {
    icon: SEMANTIC_COLOR_CLASSES.textStrong.danger,
    title: SEMANTIC_COLOR_CLASSES.textStrong.danger,
    subtitle: `${SEMANTIC_COLOR_CLASSES.textStrong.danger} opacity-80`,
    infoButton: [
      SEMANTIC_COLOR_CLASSES.border.danger,
      SEMANTIC_COLOR_CLASSES.surface.danger,
      SEMANTIC_COLOR_CLASSES.textStrong.danger,
      'hover:bg-danger-100',
    ].join(' '),
  },
  warning: {
    icon: SEMANTIC_COLOR_CLASSES.textStrong.warning,
    title: SEMANTIC_COLOR_CLASSES.textStrong.warning,
    subtitle: `${SEMANTIC_COLOR_CLASSES.textStrong.warning} opacity-80`,
    infoButton: [
      SEMANTIC_COLOR_CLASSES.border.warning,
      SEMANTIC_COLOR_CLASSES.surface.warning,
      SEMANTIC_COLOR_CLASSES.textStrong.warning,
      'hover:bg-warning-100',
    ].join(' '),
  },
  info: {
    icon: SEMANTIC_COLOR_CLASSES.textStrong.info,
    title: SEMANTIC_COLOR_CLASSES.textStrong.info,
    subtitle: `${SEMANTIC_COLOR_CLASSES.textStrong.info} opacity-80`,
    infoButton: [
      SEMANTIC_COLOR_CLASSES.border.info,
      SEMANTIC_COLOR_CLASSES.surface.info,
      SEMANTIC_COLOR_CLASSES.textStrong.info,
      'hover:bg-info-100',
    ].join(' '),
  },
  neutral: {
    icon: SEMANTIC_COLOR_CLASSES.textStrong.neutral,
    title: SEMANTIC_COLOR_CLASSES.textStrong.neutral,
    subtitle: `${SEMANTIC_COLOR_CLASSES.textStrong.neutral} opacity-80`,
    infoButton: [
      SEMANTIC_COLOR_CLASSES.border.neutral,
      SEMANTIC_COLOR_CLASSES.surface.neutral,
      SEMANTIC_COLOR_CLASSES.textStrong.neutral,
      'hover:bg-neutral-200',
    ].join(' '),
  },
};

@Component({
  selector: 'app-event-status-bar-item',
  imports: [IconComponent, ButtonComponent],
  template: `
    @let _bar = bar();
    @let _variant = variantClasses();
    @let _accent = accentClasses();

    <div class="{{ _variant.wrapper }} {{ _bar.bgClass }} {{ _bar.borderClass }}">
      <div class="{{ _variant.inner }}">
        <div class="flex items-center {{ _variant.gap }}">
          <app-icon [name]="_bar.icon" [size]="_variant.iconSize" [class]="_accent.icon"></app-icon>
          <div class="flex-1 min-w-0">
            <p class="font-semibold truncate {{ _variant.titleSize }} {{ _accent.title }}">
              {{ _bar.title }}
            </p>
            <p class="text-[10px] {{ _accent.subtitle }}">{{ _bar.subtitle }}</p>
          </div>
          <div class="flex items-center {{ _variant.actionsGap }} shrink-0">
            @if (_bar.actionButton; as action) {
              <app-button
                appearance="solid"
                [color]="action.color || _bar.color"
                [size]="_variant.actionButtonSize"
                (clicked)="barAction.emit(_bar.id)"
                class="shrink-0"
                [attr.data-testid]="_variant.showTestId ? _bar.id + '-button' : null"
              >
                {{ action.label }}
              </app-button>
            }
            @if (_bar.showInfoButton) {
              <app-button
                appearance="soft"
                [color]="_bar.color"
                [iconOnly]="true"
                iconLeft="help"
                [size]="_variant.infoButtonSize"
                (clicked)="openInfo()"
                aria-label="Szczegóły statusu"
              />
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBarItemComponent {
  private readonly overlays = inject(BottomOverlaysService);

  readonly bar = input.required<EventStatusBarConfig>();
  readonly variant = input<EventStatusBarVariant>('inline');
  readonly barAction = output<string>();

  readonly variantClasses = computed(() => VARIANTS[this.variant()]);
  readonly accentClasses = computed(() => ACCENT_VARIANTS[this.bar().color]);

  openInfo(): void {
    this.overlays.open('enrollmentDetails');
  }
}
