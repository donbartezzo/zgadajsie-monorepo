import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserAvatarComponent } from '../../user/ui/user-avatar/user-avatar.component';
import { BadgeComponent } from '../badge/badge.component';
import { ButtonComponent } from '../button/button.component';
import { UserBrief } from '../../types';

export interface UserAvatarListItem {
  user: UserBrief;
  isActive?: boolean;
}

const DEFAULT_MAX_DISPLAY = 10;

@Component({
  selector: 'app-user-avatar-list',
  imports: [RouterLink, UserAvatarComponent, BadgeComponent, ButtonComponent],
  host: { class: 'inline-flex items-center gap-2' },
  template: `
    <a [routerLink]="['/w', citySlug(), eventId(), 'participants']" class="flex -space-x-3">
      @for (item of displayItems(); track item.user.id) {
        <app-user-avatar
          [user]="item.user"
          size="xs"
          [class.opacity-40]="item.isActive === false"
          class="border-2 border-white"
        ></app-user-avatar>
      }
      @if (remainingCount() > 0) {
        <app-badge variant="soft" color="neutral" size="xs" class="z-10">
          +{{ remainingCount() }}
        </app-badge>
      }
    </a>
    @if (showButton()) {
      <a [routerLink]="['/w', citySlug(), eventId(), 'participants']" class="hidden xs:block">
        <app-button appearance="soft" color="neutral" size="xs"> Zobacz wszystkich </app-button>
      </a>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarListComponent {
  readonly items = input.required<UserAvatarListItem[]>();
  readonly citySlug = input.required<string>();
  readonly eventId = input.required<string>();
  readonly maxDisplay = input(DEFAULT_MAX_DISPLAY);
  readonly showButton = input(true);

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  readonly displayItems = computed(() => {
    const allItems = this.items();
    if (allItems.length === 0) return [];
    const shuffled = this.shuffleArray(allItems);
    return shuffled.slice(0, this.maxDisplay());
  });

  readonly remainingCount = computed(() => {
    const total = this.items().length;
    const display = this.maxDisplay();
    return total > display ? total - display : 0;
  });
}
