import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { UserAvatarComponent } from '../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ChatService } from '../../../core/services/chat.service';
import { ChatMember, ChatMembersResponse } from '../../../shared/types';

@Component({
  selector: 'app-chat-members-overlay',
  imports: [
    BottomOverlayComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    ButtonComponent,
  ],
  template: `
    <app-bottom-overlay [open]="true" title="Uczestnicy czatu" (closed)="closed.emit()">
      @if (loading()) {
      <div class="py-8 flex justify-center">
        <app-loading-spinner></app-loading-spinner>
      </div>
      } @else { @if (showOrganizerSection() && organizer(); as org) {
      <div class="flex items-center gap-3 p-3 mb-2 rounded-xl bg-highlight/5">
        <app-user-avatar
          [avatarUrl]="org.avatarUrl"
          [displayName]="org.displayName"
          size="sm"
        ></app-user-avatar>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {{ org.displayName }}
          </p>
          <span class="text-[10px] text-highlight font-semibold uppercase">Organizator</span>
        </div>
      </div>
      }

      <p class="text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
        {{ activeCount() }} aktywnych · {{ totalCount() }} łącznie
      </p>

      <div class="space-y-1">
        @for (m of members(); track m.user.id) {
        <div
          class="flex items-center gap-3 p-3 rounded-xl transition-colors"
          [class.opacity-40]="!m.isActive"
        >
          <app-user-avatar
            [avatarUrl]="m.user.avatarUrl"
            [displayName]="m.user.displayName"
            size="sm"
          ></app-user-avatar>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ m.user.displayName }}
            </p>
            @if (!m.isActive && m.inactiveReason) {
            <span class="text-[10px] text-red-500 dark:text-red-400">
              {{ m.inactiveReason }}
            </span>
            } @else {
            <span class="text-[10px] text-gray-400 dark:text-gray-500">
              @switch (m.status) { @case ('ACCEPTED') { Zaakceptowany } @case ('APPLIED') {
              Zgłoszony } @case ('RESERVE') { Rezerwa } @case ('PENDING_PAYMENT') { Oczekuje na
              płatność } @default { {{ m.status }} } }
            </span>
            }
          </div>
          @if (isOrganizer() && m.user.id !== organizerId()) {
          <div class="flex-shrink-0">
            @if (m.isBanned) {
            <app-button variant="outline" size="xs" (clicked)="onUnban(m)">Odbanuj</app-button>
            } @else if (m.isActive) {
            <app-button variant="danger" size="xs" (clicked)="onBan(m)">Banuj</app-button>
            }
          </div>
          }
        </div>
        }
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
  readonly memberBanned = output<string>();
  readonly memberUnbanned = output<string>();

  readonly members = signal<ChatMember[]>([]);
  readonly organizer = signal<ChatMembersResponse['organizer'] | null>(null);
  readonly showOrganizerSection = signal(true);
  readonly loading = signal(true);
  readonly activeCount = signal(0);
  readonly totalCount = signal(0);

  ngOnInit(): void {
    this.loadMembers();
  }

  private loadMembers(): void {
    this.chatService.getMembers(this.eventId()).subscribe({
      next: (res) => {
        this.organizer.set(res.organizer);

        const privateUserId = this.otherUserId();
        const currentUserId = this.currentUserId();
        let filtered: typeof res.members;
        let showOrganizer = true;

        if (privateUserId) {
          // For private chat, show both users: current user and the other user
          const currentUserInMembers = res.members.find((m) => m.user.id === currentUserId);
          const otherUserInMembers = res.members.find((m) => m.user.id === privateUserId);
          
          filtered = [];
          
          // Add current user if found in members
          if (currentUserInMembers) {
            filtered.push(currentUserInMembers);
          }
          
          // Add other user if found in members
          if (otherUserInMembers) {
            filtered.push(otherUserInMembers);
          }
          
          // Don't show separate organizer section if the other user is the organizer
          showOrganizer = privateUserId !== res.organizer.id;
        } else {
          // For group chat, show all members
          filtered = res.members;
        }

        this.members.set(filtered);
        this.showOrganizerSection.set(showOrganizer);

        // Check if organizer is already in members (has participation)
        const organizerInMembers = res.members.some((m) => m.user.id === res.organizer.id);
        const organizerBonus = organizerInMembers || !showOrganizer ? 0 : 1;

        this.activeCount.set(filtered.filter((m) => m.isActive).length + organizerBonus);
        this.totalCount.set(filtered.length + organizerBonus);

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onBan(member: ChatMember): void {
    this.chatService.banUser(this.eventId(), member.user.id).subscribe({
      next: () => {
        this.members.update((prev) =>
          prev.map((m) =>
            m.user.id === member.user.id
              ? { ...m, isBanned: true, isActive: false, inactiveReason: 'Zbanowany na czacie' }
              : m,
          ),
        );
        this.activeCount.update((c) => c - 1);
        this.memberBanned.emit(member.user.id);
      },
    });
  }

  onUnban(member: ChatMember): void {
    this.chatService.unbanUser(this.eventId(), member.user.id).subscribe({
      next: () => {
        this.members.update((prev) =>
          prev.map((m) =>
            m.user.id === member.user.id
              ? {
                  ...m,
                  isBanned: false,
                  isActive: !m.isWithdrawn,
                  inactiveReason: m.isWithdrawn ? 'Wypisany z wydarzenia' : null,
                }
              : m,
          ),
        );
        if (!member.isWithdrawn) {
          this.activeCount.update((c) => c + 1);
        }
        this.memberUnbanned.emit(member.user.id);
      },
    });
  }
}
