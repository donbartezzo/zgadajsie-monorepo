import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { EventHeroSlotsComponent } from '../../../event/ui/event-hero-slots/event-hero-slots.component';
import {
  ChatViewComponent,
  ChatViewMessage,
} from '../../../../shared/chat/ui/chat-view/chat-view.component';
import { ChatMembersOverlayComponent } from '../../overlays/chat-members-overlay.component';
import { ChatMessage, PrivateChatMessage, ChatMember } from '../../../../shared/types';
import { UserAvatarListItem } from '../../../../shared/ui/user-avatar-list/user-avatar-list.component';
import { BaseChatComponent } from '../base-chat.component';
import { isChatAccessDeniedError, isChatAccessDeniedMessage } from '../../../../shared/utils';

@Component({
  selector: 'app-unified-chat',
  imports: [EventHeroSlotsComponent, ChatViewComponent, ChatMembersOverlayComponent],
  host: { class: 'flex flex-col flex-1 min-h-0' },
  template: `
    <app-event-hero-slots [event]="event()" />

    <div class="flex-1 flex flex-col min-h-0">
      <app-chat-view
        [messages]="chatViewMessages()"
        [currentUserId]="currentUserId"
        [loading]="loading()"
        [typingUser]="typingUser()"
        [inactiveUsers]="inactiveUsers()"
        [disabled]="!isPrivate && chatDisabled()"
        [accessDenied]="chatAccessDenied()"
        [eventId]="eventId"
        [organizerId]="organizerId()"
        [citySlug]="event()?.city?.slug || ''"
        [isPrivate]="isPrivate"
        [chatTitle]="chatTitle()"
        [members]="chatMemberAvatarItems()"
        [organizer]="event()?.organizer || null"
        (messageSent)="send($event)"
        (typing)="onTyping()"
      ></app-chat-view>
    </div>

    @if (showMembers()) {
      <app-chat-members-overlay
        [eventId]="eventId"
        [isOrganizer]="isOrganizer()"
        [organizerId]="organizerId()"
        [otherUserId]="isPrivate ? otherUserId : ''"
        [currentUserId]="currentUserId"
        (closed)="showMembers.set(false)"
      ></app-chat-members-overlay>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnifiedChatComponent extends BaseChatComponent implements OnInit {
  readonly groupMessages = signal<ChatMessage[]>([]);

  otherUserId = '';
  isPrivate = false;

  readonly chatTitle = computed(() => {
    if (this.isPrivate) {
      return `Czat z ${this.otherUserName() || 'uczestnikiem'}`;
    }
    return 'Czat grupowy';
  });

  readonly chatMembers = computed<ChatMember[]>(() => {
    // Group chat only: show all participants (organizer + members), including inactive ones
    const allMembers = this.members();
    const organizer = this.event()?.organizer;
    if (!organizer) return allMembers;

    const organizerInMembers = allMembers.some((m) => m.user.id === organizer.id);
    if (organizerInMembers) {
      return allMembers;
    }
    return [
      {
        user: organizer,
        status: 'ORGANIZER',
        isActive: true,
        isWithdrawn: false,
        inactiveReason: null,
      } as ChatMember,
      ...allMembers,
    ];
  });

  readonly chatMemberAvatarItems = computed<UserAvatarListItem[]>(() => {
    if (this.isPrivate) {
      // Private chat: build directly from available signals, no HTTP needed
      const result: UserAvatarListItem[] = [];
      const currentUser = this.auth.currentUser();
      if (currentUser) {
        result.push({ user: currentUser, isActive: true });
      }
      for (const msg of this.privateMessages()) {
        if (msg.sender?.id === this.otherUserId) {
          result.push({ user: msg.sender, isActive: true });
          break;
        }
        if (msg.recipient?.id === this.otherUserId) {
          result.push({ user: msg.recipient, isActive: true });
          break;
        }
      }
      return result;
    }
    return this.chatMembers().map((m) => ({ user: m.user, isActive: m.isActive }));
  });

  readonly chatViewMessages = computed<ChatViewMessage[]>(() => {
    if (this.isPrivate) {
      return this.privateChatViewMessages();
    }
    return this.groupMessages().map((msg) => ({
      id: msg.id,
      senderId: msg.userId,
      content: msg.content,
      createdAt: msg.createdAt,
      sender: msg.user ?? undefined,
    }));
  });

  ngOnInit(): void {
    this.initBaseData();
    this.isPrivate = !!this.route.snapshot.data['isPrivate'];

    // Event data comes from EventAreaService (loaded by parent EventAreaComponent)
    const e = this.event();
    if (e) {
      this.organizerId.set(e.organizerId);
      this.isOrganizer.set(e.organizerId === this.currentUserId);
    }

    if (this.isPrivate) {
      const slug = this.eventArea.citySlug;
      const organizerId = e?.organizerId;

      if (organizerId !== this.currentUserId) {
        this.navigation.navigateToEventOrganizerChat(this.eventId, slug);
        return;
      }

      this.otherUserId = this.route.snapshot.paramMap.get('userId') ?? '';

      if (!this.otherUserId || this.otherUserId === this.currentUserId) {
        this.navigation.navigateToEventOrganizerChat(this.eventId, slug);
        return;
      }

      this.initPrivateChat();
    } else {
      this.initGroupChat();
    }

    if (!this.isPrivate) {
      this.loadMemberCount();
    }
  }

  send(content: string): void {
    if (this.isPrivate) {
      this.chatService.sendPrivateMessage(this.eventId, this.otherUserId, content);
    } else {
      this.chatService.sendMessage(this.eventId, content);
    }
  }

  onTyping(): void {
    if (this.isPrivate) {
      this.chatService.sendPrivateTyping(this.eventId, this.otherUserId);
    } else {
      this.chatService.sendTyping(this.eventId);
    }
  }

  private initPrivateChat(): void {
    this.initPrivateChatBase(this.otherUserId, (data) => {
      this.setOtherUserNameFromMessages(data);
    });
  }

  private initGroupChat(): void {
    this.chatService.getHistory(this.eventId).subscribe({
      next: (res) => {
        this.groupMessages.set(res.data);
        this.loading.set(false);

        this.chatService.connect(this.eventId);

        this.msgSub = this.chatService.onMessage().subscribe((msg) => {
          this.groupMessages.update((prev) => [...prev, msg]);
        });

        this.typingSub = this.chatService.onTyping().subscribe((data) => {
          if (data.userId !== this.currentUserId) {
            this.handleTypingIndicator(data);
          }
        });

        this.errorSub = this.chatService.onErrorMessage().subscribe((data) => {
          if (data.message) {
            if (isChatAccessDeniedMessage(data.message)) {
              this.chatAccessDenied.set(true);
              return;
            }

            this.snackbar.error(data.message);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        if (isChatAccessDeniedError(err)) {
          this.chatAccessDenied.set(true);
          return;
        }

        this.snackbar.error(err?.error?.message || 'Nie udało się załadować czatu');
      },
    });
  }

  private setOtherUserNameFromMessages(msgs: PrivateChatMessage[]): void {
    if (this.otherUserName()) return;
    for (const msg of msgs) {
      if (msg.sender && msg.sender.id === this.otherUserId) {
        this.otherUserName.set(msg.sender.displayName);
        return;
      }
      if (msg.recipient && msg.recipient.id === this.otherUserId) {
        this.otherUserName.set(msg.recipient.displayName);
        return;
      }
    }
    this.otherUserName.set('Uczestnik');
  }
}
