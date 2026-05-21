import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeComponent } from '../badge/badge.component';
import { ExplainerTriggerComponent } from '../explainer/explainer-trigger.component';
import { STATUS_INDICATORS, type StatusIndicatorType } from '@zgadajsie/shared';

export type StatusIndicatorVariant = 'icon' | 'icon-label';

@Component({
  selector: 'app-status-indicator',
  imports: [BadgeComponent, ExplainerTriggerComponent],
  template: `
    @let config = _config();

    @switch (variant()) {
      @case ('icon') {
        <app-badge
          [icon]="config.icon"
          [color]="config.color"
          variant="soft"
          size="xs"
          [square]="true"
          [borderColor]="config.color"
          [hasShadow]="true"
        />
      }

      @case ('icon-label') {
        <app-explainer-trigger [title]="config.label" [description]="_description()">
          <app-badge
            [icon]="config.icon"
            [color]="config.color"
            variant="soft"
            size="sm"
            [borderColor]="config.color"
            [hasShadow]="true"
          >
            {{ config.label }}
            @if (detail()) {
              <span class="opacity-70">· {{ detail() }}</span>
            }
          </app-badge>
        </app-explainer-trigger>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusIndicatorComponent {
  readonly type = input.required<StatusIndicatorType>();
  readonly variant = input<StatusIndicatorVariant>('icon-label');
  readonly detail = input<string | null>(null);

  readonly _config = computed(() => STATUS_INDICATORS[this.type()]);

  readonly _description = computed(() => {
    const detail = this.detail();
    const config = this._config();
    return detail ? `${config.description} (${detail})` : config.description;
  });
}
