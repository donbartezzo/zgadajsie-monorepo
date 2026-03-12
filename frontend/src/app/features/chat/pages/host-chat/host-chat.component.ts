import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../../../core/icons/icon.component';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { ChatViewComponent } from '../../../../shared/ui/chat-view/chat-view.component';
import { ChatMembersOverlayComponent } from '../../overlays/chat-members-overlay.component';
import { OrganizerConversation } from '../../../../shared/types';
import { BaseChatComponent } from '../base-chat.component';

@Component({
  selector: 'app-host-chat',
  imports: [
    DatePipe,
    IconComponent,
    LayoutSlotDirective,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    ChatViewComponent,
    ChatMembersOverlayComponent,
  ],
  template: `
    <ng-template appLayoutSlot="overlay">
      <h1 class="text-lg font-extrabold text-white leading-tight">{{ headerTitle() }}</h1>
      <p class="text-xs text-white/80 mt-0.5">{{ headerSubtitle() }}</p>
    </ng-template>

    <ng-template appLayoutSlot="miniBar">
      <p class="text-xs font-bold text-gray-900 truncate">{{ headerTitle() }}</p>
      <p class="text-[10px] text-gray-400 mt-0.5">{{ headerSubtitle() }}</p>
    </ng-template>

    <ng-template appLayoutSlot="badge">
      @if (!chatDisabled()) {
        <button
          type="button"
          class="relative grid h-8 w-8 place-items-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors mt-1 mr-2"
          (click)="showMembers.set(true)"
          aria-label="Uczestnicy"
        >
          <app-icon name="users" size="sm"></app-icon>
          @if (memberCount(); as count) {
          <span
            class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-highlight text-[10px] font-bold text-white px-1"
          >
            {{ count }}
          </span>
          }
        </button>
      }
    </ng-template>

    @if (isOrganizerMode()) {
    <!-- ─── ORGANIZER: conversation list ─── -->
    <div class="p-4">
      @if (loading()) {
      <div class="py-8 flex justify-center">
        <app-loading-spinner></app-loading-spinner>
      </div>
      } @else if (conversations().length === 0) {
      <div class="text-center py-8">
        <app-icon
          name="message-circle"
          size="lg"
          class="text-gray-300 mx-auto mb-3"
        ></app-icon>
        <p class="text-sm text-gray-500">
          Brak prywatnych konwersacji z uczestnikami
        </p>
      </div>
      } @else {
      <div class="space-y-1">
        @for (conv of conversations(); track conv.participant.id) {
        <button
          type="button"
          class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
          (click)="openChat(conv.participant.id)"
        >
          <app-user-avatar
            [avatarUrl]="conv.participant.avatarUrl"
            [displayName]="conv.participant.displayName"
            size="sm"
          ></app-user-avatar>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ conv.participant.displayName }}
              </p>
              @if (conv.lastMessage) {
              <span class="text-[10px] text-gray-400 flex-shrink-0">
                {{ conv.lastMessage.createdAt | date: 'dd.MM, HH:mm' }}
              </span>
              }
            </div>
            @if (conv.lastMessage) {
            <p class="text-xs text-gray-500 truncate">
              @if (conv.lastMessage.isFromOrganizer) {
              <span class="text-gray-400">Ty: </span>
              }
              {{ conv.lastMessage.content }}
            </p>
            }
            @if (conv.messageCount > 0) {
            <span
              class="inline-block mt-0.5 text-[10px] bg-highlight/10 text-highlight px-1.5 py-0.5 rounded-full"
            >
              {{ conv.messageCount }}
              {{ conv.messageCount === 1 ? 'wiadomość' : 'wiadomości' }}
            </span>
            }
          </div>
          <app-icon
            name="chevron-right"
            size="sm"
            class="text-gray-300 flex-shrink-0"
          ></app-icon>
        </button>
        }
      </div>
      }
    </div>
    } @else {
    <!-- ─── PARTICIPANT: private chat with organizer ─── -->
    <div class="flex-1 flex flex-col min-h-0">
      <app-chat-view
        [messages]="privateChatViewMessages()"
        [currentUserId]="currentUserId"
        [loading]="loading()"
        [typingUser]="typingUser()"
        [disabled]="chatDisabled()"
        (messageSent)="send($event)"
        (typing)="onTyping()"
      ></app-chat-view>
    </div>
    }

    @if (showMembers()) {
    <app-chat-members-overlay
      [eventId]="eventId"
      [isOrganizer]="isOrganizer()"
      [organizerId]="organizerId()"
      [currentUserId]="currentUserId"
      (closed)="showMembers.set(false)"
      (memberBanned)="onMemberBanned($event)"
      (memberUnbanned)="onMemberUnbanned($event)"
    ></app-chat-members-overlay>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostChatComponent extends BaseChatComponent implements OnInit {
  readonly conversations = signal<OrganizerConversation[]>([]);
  readonly isOrganizerMode = signal(false);
  readonly otherUserName = signal('');

  private hostOrganizerId = '';

  readonly headerTitle = computed(() => {
    if (this.isOrganizerMode()) {
      return 'Konwersacje prywatne';
    }
    return this.otherUserName() || 'Wiadomość prywatna';
  });

  readonly headerSubtitle = computed(() =>
    this.isOrganizerMode() ? 'Organizator' : 'Wiadomość prywatna',
  );

  ngOnInit(): void {
    this.initBaseData();

    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.hostOrganizerId = e.organizerId;
        this.organizerId.set(e.organizerId);
        this.isOrganizer.set(e.organizerId === this.currentUserId);

        if (e.organizerId === this.currentUserId) {
          this.isOrganizerMode.set(true);
          this.loadConversations();
        } else {
          this.isOrganizerMode.set(false);
          this.otherUserName.set(e.organizer?.displayName ?? 'Organizator');
          this.initPrivateChat();
        }
      },
      error: () => this.loading.set(false),
    });

    this.loadMemberCount();
  }

  openChat(participantId: string): void {
    const slug = this.event()?.city?.slug;
    this.router.navigate(['/w', slug, this.eventId, 'host-chat', participantId]);
  }

  send(content: string): void {
    this.chatService.sendPrivateMessage(this.eventId, this.hostOrganizerId, content);
  }

  onTyping(): void {
    this.chatService.sendPrivateTyping(this.eventId, this.hostOrganizerId);
  }

  private loadConversations(): void {
    this.chatService.getOrganizerConversations(this.eventId).subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private initPrivateChat(): void {
    this.initPrivateChatBase(this.hostOrganizerId);
  }
}
