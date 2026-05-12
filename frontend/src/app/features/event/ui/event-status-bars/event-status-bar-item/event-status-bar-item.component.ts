import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { UserAvatarComponent } from '../../../../../shared/user/ui/user-avatar/user-avatar.component';
import type { AvatarUser } from '../../../../../shared/types';

export interface EventStatusBarConfig {
  id: string;
  title: string;
  subtitle?: string;
  bgClass: string;
  borderClass: string;
  enrollments?: AvatarUser[];
}

export type EventStatusBarVariant = 'inline' | 'sticky';

interface VariantClasses {
  wrapper: string;
  inner: string;
  gap: string;
  titleSize: string;
  subtitleSize: string;
  showSubtitle: boolean;
}

const VARIANTS: Record<EventStatusBarVariant, VariantClasses> = {
  inline: {
    wrapper:
      'relative z-10 overflow-hidden -mx-4 cursor-pointer hover:brightness-110 transition-all duration-200',
    inner: 'px-4 py-3 md:py-4',
    gap: 'gap-3',
    titleSize: 'text-base md:text-lg lg:text-xl',
    subtitleSize: 'text-sm md:text-base lg:text-lg',
    showSubtitle: true,
  },
  sticky: {
    wrapper: 'cursor-pointer hover:brightness-110 transition-all duration-200',
    inner: 'px-3 py-2 md:py-3',
    gap: 'gap-3',
    titleSize: 'text-base md:text-lg lg:text-xl',
    subtitleSize: 'text-sm md:text-base lg:text-lg',
    showSubtitle: false,
  },
};

@Component({
  selector: 'app-event-status-bar-item',
  imports: [IconComponent, UserAvatarComponent],
  template: `
    @let _bar = bar();
    @let _variant = variantClasses();

    <div
      class="{{ _variant.wrapper }} {{ _bar.bgClass }} {{ _bar.borderClass }}"
      (click)="onBarClick()"
      (keyup.enter)="onBarClick()"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Szczegóły statusu: ' + _bar.title"
    >
      <div class="{{ _variant.inner }}">
        <div class="flex items-center {{ _variant.gap }}">
          <div class="flex-1 min-w-0 text-center">
            <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span class="font-bold truncate max-w-full {{ _variant.titleSize }} text-white">
                {{ _bar.title }}
              </span>
              @if (_bar.enrollments && _bar.enrollments.length > 0) {
                @if (_bar.enrollments.length === 1) {
                  @let _enrollment = _bar.enrollments[0];
                  <div class="flex items-center gap-2 min-w-0 max-w-full">
                    <div class="relative h-7 w-7 shrink-0 rounded-full">
                      <app-user-avatar [user]="_enrollment" size="xs" />
                    </div>
                    <span class="text-sm text-white opacity-90 truncate">
                      {{ _enrollment.displayName }}
                    </span>
                  </div>
                } @else {
                  <div class="flex flex-wrap items-center justify-center -space-x-2 max-w-full">
                    @for (e of _bar.enrollments; track e.id) {
                      <div class="relative h-7 w-7 shrink-0 rounded-full">
                        <app-user-avatar [user]="e" size="xs" />
                      </div>
                    }
                  </div>
                }
              }
            </div>

            @if (_variant.showSubtitle && _bar.subtitle) {
              <p class="truncate {{ _variant.subtitleSize }} opacity-90 text-white">
                {{ _bar.subtitle }}
              </p>
            }
          </div>
          <app-icon name="chevron-right" size="md" class="text-white shrink-0" />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusBarItemComponent {
  readonly bar = input.required<EventStatusBarConfig>();
  readonly variant = input<EventStatusBarVariant>('inline');
  readonly barClick = output<string>();

  readonly variantClasses = computed(() => VARIANTS[this.variant()]);

  onBarClick(): void {
    this.barClick.emit(this.bar().id);
  }
}
