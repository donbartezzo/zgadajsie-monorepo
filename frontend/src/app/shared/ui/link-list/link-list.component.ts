import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { IconName } from '../icon/icon.component';
import { SemanticColor } from '../../types/colors';

export interface LinkListItem {
  label: string;
  description?: string;
  icon?: IconName;
  value?: string;
  disabled?: boolean;
  loading?: boolean;
  color?: SemanticColor;
  iconColor?: SemanticColor;
  iconBackground?: boolean;
}

@Component({
  selector: 'app-link-list',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div>
      @for (item of items(); track item.value || item.label; let isLast = $last) {
      <app-button
        appearance="ghost"
        [color]="item.color || 'neutral'"
        [fullWidth]="true"
        alignment="start"
        [disabled]="item.disabled || false"
        [loading]="item.loading || false"
        [ariaLabel]="item.label"
        [iconLeft]="item.icon"
        [iconLeftBackground]="item.iconBackground || false"
        iconRight="chevron-right"
        (clicked)="itemClicked.emit(item)"
        class="!min-h-0 !rounded-none !px-0 !py-2"
      >
        <div class="min-w-0 flex-1 text-left">
          <span class="block text-sm font-medium leading-5 text-neutral-900">{{ item.label }}</span>
          @if (item.description) {
          <span class="mt-0.5 block text-xs leading-4 text-neutral-500">{{
            item.description
          }}</span>
          }
        </div>
      </app-button>
      @if (!isLast) {
      <div class="mx-3 border-b border-neutral-100"></div>
      } }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkListComponent {
  readonly items = input.required<LinkListItem[]>();
  readonly itemClicked = output<LinkListItem>();
}
