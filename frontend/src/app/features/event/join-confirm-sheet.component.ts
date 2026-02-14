import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../core/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { BottomSheetComponent } from '../../shared/ui/bottom-sheet/bottom-sheet.component';
import { Event as EventModel, Participation } from '../../shared/types';

@Component({
  selector: 'app-join-confirm-sheet',
  imports: [CommonModule, IconComponent, ButtonComponent, UserAvatarComponent, BottomSheetComponent],
  template: `
    <app-bottom-sheet
      [open]="open()"
      (closed)="closed.emit()"
    >
      <div class="text-center">
        <div class="mx-auto my-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <app-icon name="check" size="lg" class="text-green-500 dark:text-green-400"></app-icon>
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Dołącz do wydarzenia</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Potwierdź swoje uczestnictwo w tym wydarzeniu</p>

        <!-- Event info row -->
        <div class="mt-4 border-t border-b border-gray-100 dark:border-slate-700 py-3">
          <div class="flex justify-center gap-6 text-center">
            <div>
              <app-icon name="calendar" size="sm" variant="primary"></app-icon>
              <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{{ startDateFormatted() }}</p>
            </div>
            <div>
              <app-icon name="clock" size="sm" variant="muted"></app-icon>
              <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{{ startTimeFormatted() }}–{{ endTimeFormatted() }}</p>
            </div>
            <div>
              <app-icon name="map-pin" size="sm" variant="danger"></app-icon>
              <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{{ address() || 'Brak' }}</p>
            </div>
          </div>
        </div>

        <!-- Participants preview -->
        @if (participants().length > 0) {
        <div class="mt-3 flex items-center justify-center gap-1">
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
          <span class="text-xs text-gray-400 dark:text-gray-500 ml-2">+{{ remainingCount() }} innych</span>
          }
        </div>
        }

        <app-button
          variant="success"
          [fullWidth]="true"
          [loading]="loading()"
          (clicked)="confirmed.emit()"
          class="mt-5 block"
        >
          <app-icon name="check" size="sm"></app-icon>
          Potwierdzam uczestnictwo
        </app-button>
      </div>
    </app-bottom-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinConfirmSheetComponent {
  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly participants = input<Participation[]>([]);
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  readonly visibleAvatars = computed(() => this.participants().slice(0, 6));
  readonly remainingCount = computed(() => Math.max(0, this.participants().length - 6));

  readonly address = computed(() => this.event()?.address || '');

  readonly startDateFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  });

  readonly startTimeFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  });

  readonly endTimeFormatted = computed(() => {
    const e = this.event();
    if (!e) return '';
    return new Date(e.endsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  });
}
