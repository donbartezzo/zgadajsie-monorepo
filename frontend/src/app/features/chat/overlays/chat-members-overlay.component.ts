import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { UserAvatarComponent } from '../../../shared/user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { ChatService } from '../../../core/services/chat.service';
import { ChatMember } from '../../../shared/types';

@Component({
  selector: 'app-chat-members-overlay',
  imports: [BottomOverlayComponent, UserAvatarComponent, LoadingSpinnerComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Uczestnicy czatu" (closed)="closed.emit()">
      @if (loading()) {
        <div class="py-8 flex justify-center">
          <app-loading-spinner></app-loading-spinner>
        </div>
      } @else {
        <div class="max-w-lg mx-auto">
          <p class="text-xs text-neutral-400 mb-2 px-1">
            {{ activeCount() }} aktywnych · {{ totalCount() }} łącznie
          </p>

          <div class="space-y-1">
            @for (m of members(); track m.user.id) {
              <div
                class="flex items-center gap-3 p-3 rounded-xl transition-colors"
                [class.opacity-40]="!m.isActive"
                [class.bg-primary-500/5]="m.user.id === organizerId()"
              >
                <app-user-avatar
                  [avatarUrl]="m.user.avatarUrl"
                  [displayName]="m.user.displayName"
                  size="sm"
                ></app-user-avatar>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-900 truncate">
                    {{ m.user.displayName }}
                  </p>
                  @if (m.user.id === organizerId()) {
                    <span class="text-[10px] text-primary-500 font-semibold uppercase"
                      >Organizator</span
                    >
                  } @else if (m.inactiveReason) {
                    <span class="text-[10px] text-neutral-400">
                      {{ m.inactiveReason }}
                    </span>
                  } @else {
                    <span class="text-[10px] text-neutral-400">
                      @switch (m.status) {
                        @case ('ACCEPTED') {
                          Zaakceptowany
                        }
                        @case ('APPLIED') {
                          Zgłoszony
                        }
                        @case ('PENDING_PAYMENT') {
                          Oczekuje na płatność
                        }
                        @default {
                          {{ m.status }}
                        }
                      }
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMembersOverlayComponent implements OnInit {
  private readonly chatService = inject(ChatService);

  readonly eventId = input.required<string>();
  readonly isOrganizer = input(false);
  readonly organizerId = input('');
  readonly otherUserId = input('');
  readonly currentUserId = input.required<string>();
  readonly closed = output<void>();

  readonly members = signal<ChatMember[]>([]);
  readonly loading = signal(true);
  readonly activeCount = signal(0);
  readonly totalCount = signal(0);

  ngOnInit(): void {
    this.loadMembers();
  }

  private loadMembers(): void {
    this.chatService.getMembers(this.eventId()).subscribe({
      next: (res) => {
        const privateUserId = this.otherUserId();
        const currentUserId = this.currentUserId();
        let filtered: typeof res.members;

        if (privateUserId) {
          const currentUserInMembers = res.members.find((m) => m.user.id === currentUserId);
          const otherUserInMembers = res.members.find((m) => m.user.id === privateUserId);

          filtered = [];
          if (currentUserInMembers) filtered.push(currentUserInMembers);
          if (otherUserInMembers) filtered.push(otherUserInMembers);
        } else {
          filtered = res.members;
        }

        // Ensure organizer is first on the list
        const orgId = res.organizer.id;
        const organizerInList = filtered.some((m) => m.user.id === orgId);

        if (organizerInList) {
          filtered = [
            ...filtered.filter((m) => m.user.id === orgId),
            ...filtered.filter((m) => m.user.id !== orgId),
          ];
        } else {
          // Organizer not in members (no participation) - create a virtual entry
          filtered = [
            {
              user: res.organizer,
              status: 'ORGANIZER',
              isActive: true,
              isWithdrawn: false,
              inactiveReason: null,
            } as ChatMember,
            ...filtered,
          ];
        }

        this.members.set(filtered);
        this.activeCount.set(filtered.filter((m) => m.isActive).length);
        this.totalCount.set(filtered.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
