import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../core/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { BottomSheetComponent } from '../../shared/ui/bottom-sheet/bottom-sheet.component';
import { Event as EventModel, Participation } from '../../shared/types';

@Component({
  selector: 'app-leave-confirm-sheet',
  imports: [CommonModule, IconComponent, ButtonComponent, UserAvatarComponent, BottomSheetComponent],
  template: `
    <app-bottom-sheet
      [open]="open()"
      (closed)="closed.emit()"
    >
      <div class="text-center">
        <div class="mx-auto my-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <app-icon name="user-x" size="lg" variant="danger"></app-icon>
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Wypisz się z wydarzenia</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Czy na pewno chcesz zrezygnować z uczestnictwa?</p>

        <!-- Organizer + participants -->
        @if (event(); as e) {
        <div class="mt-4 flex items-center justify-center gap-4">
          @if (e.organizer) {
          <div class="flex items-center gap-1.5">
            <app-user-avatar
              [avatarUrl]="e.organizer!.avatarUrl"
              [displayName]="e.organizer!.displayName"
              size="sm"
            ></app-user-avatar>
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ e.organizer!.displayName }}</span>
          </div>
          }
          @if (participants().length > 0) {
          <div class="flex items-center gap-1">
            <div class="flex -space-x-2">
              @for (p of visibleAvatars(); track p.id) {
              <app-user-avatar
                [avatarUrl]="p.user?.avatarUrl"
                [displayName]="p.user?.displayName || ''"
                size="sm"
                class="ring-2 ring-white dark:ring-slate-800 rounded-full"
              ></app-user-avatar>
              }
            </div>
            @if (remainingCount() > 0) {
            <span class="text-xs text-gray-400 dark:text-gray-500">+{{ remainingCount() }}</span>
            }
          </div>
          }
        </div>
        }

        <div class="mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
          <app-button
            variant="success"
            [fullWidth]="true"
            [loading]="loading()"
            (clicked)="confirmed.emit()"
          >
            <app-icon name="check" size="sm"></app-icon>
            Tak, wypisz mnie
          </app-button>
        </div>
      </div>
    </app-bottom-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveConfirmSheetComponent {
  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly participants = input<Participation[]>([]);
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  readonly visibleAvatars = computed(() => this.participants().slice(0, 6));
  readonly remainingCount = computed(() => Math.max(0, this.participants().length - 6));
}
