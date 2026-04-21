import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { EventHeroSlotsComponent } from '../../../event/ui/event-hero-slots/event-hero-slots.component';
import { UserAvatarComponent } from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { ChatViewComponent } from '../../../../shared/chat/ui/chat-view/chat-view.component';
import { ChatMembersOverlayComponent } from '../../overlays/chat-members-overlay.component';
import { OrganizerConversation } from '../../../../shared/types';
import { BaseChatComponent } from '../base-chat.component';

@Component({
  selector: 'app-host-chat',
  imports: [
    DatePipe,
    IconComponent,
    EventHeroSlotsComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    ChatViewComponent,
    ChatMembersOverlayComponent,
  ],
  host: { class: 'flex flex-col flex-1 min-h-0' },
  template: `
    <app-event-hero-slots [event]="event()" />

    @if (isOrganizerMode()) {
      <!-- ─── ORGANIZER: conversation list ─── -->
      @if (loading()) {
        <div class="flex flex-1 items-center justify-center">
          <app-loading-spinner></app-loading-spinner>
        </div>
      } @else if (conversations().length === 0) {
        <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <app-icon name="message-circle" size="lg" class="text-neutral-300"></app-icon>
          <p class="text-sm text-neutral-500">Brak prywatnych konwersacji z uczestnikami</p>
        </div>
      } @else {
        <div class="flex-1 min-h-0 overflow-y-auto p-4">
          <div class="space-y-1">
            @for (conv of conversations(); track conv.participant.id) {
              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                (click)="openChat(conv.participant.id)"
              >
                <app-user-avatar
                  [avatarUrl]="conv.participant.avatarUrl"
                  [displayName]="conv.participant.displayName"
                  size="sm"
                ></app-user-avatar>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-neutral-900 truncate">
                      {{ conv.participant.displayName }}
                    </p>
                    @if (conv.lastMessage) {
                      <span class="text-[10px] text-neutral-400 flex-shrink-0">
                        {{ conv.lastMessage.createdAt | date: 'dd.MM, HH:mm' }}
                      </span>
                    }
                  </div>
                  @if (conv.lastMessage) {
                    <p class="text-xs text-neutral-500 truncate">
                      @if (conv.lastMessage.isFromOrganizer) {
                        <span class="text-neutral-400">Ty: </span>
                      }
                      {{ conv.lastMessage.content }}
                    </p>
                  }
                  @if (conv.messageCount > 0) {
                    <span
                      class="inline-block mt-0.5 text-[10px] bg-primary-50 text-primary-500 px-1.5 py-0.5 rounded-full"
                    >
                      {{ conv.messageCount }}
                      {{ conv.messageCount === 1 ? 'wiadomość' : 'wiadomości' }}
                    </span>
                  }
                </div>
                <app-icon
                  name="chevron-right"
                  size="sm"
                  class="text-neutral-300 flex-shrink-0"
                ></app-icon>
              </button>
            }
          </div>
        </div>
      }
    } @else {
      <!-- ─── PARTICIPANT: private chat with organizer ─── -->
      <div class="flex-1 flex flex-col min-h-0">
        <app-chat-view
          [messages]="privateChatViewMessages()"
          [currentUserId]="currentUserId"
          [loading]="loading()"
          [typingUser]="typingUser()"
          [disabled]="chatDisabled()"
          [accessDenied]="chatAccessDenied()"
          [isPrivate]="true"
          [eventId]="eventId"
          [citySlug]="event()?.city?.slug || ''"
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

  ngOnInit(): void {
    this.initBaseData();

    // Event data comes from EventAreaService (loaded by parent EventAreaComponent)
    const e = this.event();
    if (e) {
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
    } else {
      this.loading.set(false);
    }

    this.loadMemberCount();
  }

  openChat(participantId: string): void {
    this.router.navigate(['/w', this.eventArea.citySlug, this.eventId, 'host-chat', participantId]);
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
