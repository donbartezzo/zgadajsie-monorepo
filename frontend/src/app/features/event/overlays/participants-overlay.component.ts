import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UserAvatarComponent } from '../../../shared/ui/user-avatar/user-avatar.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { Participation } from '../../../shared/types';

@Component({
  selector: 'app-participants-overlay',
  imports: [UserAvatarComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay
      [open]="true"
      [title]="'Uczestnicy (' + participants().length + ')'"
      (closed)="closed.emit()"
    >
      <div class="divide-y divide-gray-100 dark:divide-slate-700">
        @for (p of participants(); track p.id) {
          <div class="flex items-center gap-3 py-3">
            <app-user-avatar
              [avatarUrl]="p.user?.avatarUrl"
              [displayName]="p.user?.displayName || ''"
              size="lg"
            ></app-user-avatar>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ p.user?.displayName }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">Uczestnik</p>
            </div>
          </div>
        }
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantsOverlayComponent {
  readonly participants = input<Participation[]>([]);
  readonly closed = output<void>();
}
