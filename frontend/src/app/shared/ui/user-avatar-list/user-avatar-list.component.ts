import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserAvatarComponent } from '../../user/ui/user-avatar/user-avatar.component';
import { UserBrief } from '../../types';

export interface UserAvatarListItem {
  user: UserBrief;
  isActive?: boolean;
}

@Component({
  selector: 'app-user-avatar-list',
  imports: [RouterLink, UserAvatarComponent],
  host: { class: 'inline-flex -space-x-2 cursor-pointer' },
  template: `
    <a
      [routerLink]="['/w', citySlug(), eventId(), 'participants']"
      class="flex items-center -space-x-2"
    >
      @for (item of displayItems(); track item.user.id) {
        <app-user-avatar
          [user]="item.user"
          size="xs"
          [class.opacity-40]="item.isActive === false"
          class="border-2 border-white"
        ></app-user-avatar>
      }
      @if (remainingCount() > 0) {
        <div
          class="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 border-2 border-white text-[10px] font-medium text-neutral-500"
        >
          +{{ remainingCount() }}
        </div>
      }
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarListComponent {
  readonly items = input.required<UserAvatarListItem[]>();
  readonly citySlug = input.required<string>();
  readonly eventId = input.required<string>();
  readonly maxDisplay = input(5);

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
