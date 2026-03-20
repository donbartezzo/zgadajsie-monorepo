import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { EventHeroSlotsComponent } from '../../../event/ui/event-hero-slots/event-hero-slots.component';
import {
  ChatViewComponent,
  ChatViewMessage,
} from '../../../../shared/chat/ui/chat-view/chat-view.component';
import { ChatMembersOverlayComponent } from '../../overlays/chat-members-overlay.component';
import { ChatMessage, PrivateChatMessage } from '../../../../shared/types';
import { BaseChatComponent } from '../base-chat.component';

@Component({
  selector: 'app-unified-chat',
  imports: [EventHeroSlotsComponent, ChatViewComponent, ChatMembersOverlayComponent],
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
        [eventId]="eventId"
        [organizerId]="organizerId()"
        [citySlug]="event()?.city?.slug || ''"
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
      (memberBanned)="onMemberBanned($event)"
      (memberUnbanned)="onMemberUnbanned($event)"
    ></app-chat-members-overlay>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnifiedChatComponent extends BaseChatComponent implements OnInit {
  readonly groupMessages = signal<ChatMessage[]>([]);
  readonly otherUserName = signal('');
  readonly chatBanned = signal(false);

  otherUserId = '';
  isPrivate = false;

  readonly chatViewMessages = computed<ChatViewMessage[]>(() => {
    if (this.isPrivate) {
      return this.privateChatViewMessages();
    }
    return this.groupMessages().map((msg) => ({
      id: msg.id,
      senderId: msg.userId,
      content: msg.content,
      createdAt: msg.createdAt,
      sender: msg.user
        ? { id: msg.user.id, displayName: msg.user.displayName, avatarUrl: msg.user.avatarUrl }
        : undefined,
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
        this.router.navigate(['/w', slug, this.eventId, 'host-chat']);
        return;
      }

      this.otherUserId = this.route.snapshot.paramMap.get('userId') ?? '';

      if (!this.otherUserId || this.otherUserId === this.currentUserId) {
        this.router.navigate(['/w', slug, this.eventId, 'host-chat']);
        return;
      }

      this.initPrivateChat();
    } else {
      this.initGroupChat();
    }

    this.loadMemberCount();
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

  override loadMemberCount(): void {
    this.chatService.getMembers(this.eventId).subscribe({
      next: (res) => {
        if (this.isPrivate) {
          this.memberCount.set(2);
        } else if (res?.members) {
          const organizerInMembers = res.members.some((m) => m.user.id === res.organizer.id);
          this.memberCount.set(res.members.length + (organizerInMembers ? 0 : 1));
        }

        if (res?.members) {
          const inactiveMap = new Map<string, 'banned' | 'withdrawn'>();
          res.members.forEach((m) => {
            if (m.isBanned) {
              inactiveMap.set(m.user.id, 'banned');
            } else if (m.isWithdrawn) {
              inactiveMap.set(m.user.id, 'withdrawn');
            }
          });
          this.inactiveUsers.set(inactiveMap);

          const currentUserBanned = res.members.some(
            (m) => m.user.id === this.currentUserId && m.isBanned,
          );
          if (currentUserBanned && !this.isPrivate) {
            this.chatBanned.set(true);
            this.chatDisabled.set(true);
          }
        }
      },
    });
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
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.error?.message?.includes('Brak dostępu do czatu grupowego')) {
          this.chatBanned.set(true);
          this.chatDisabled.set(true);
          this.snackbar.error('Jesteś zbanowany na czacie tego wydarzenia');
        } else {
          this.snackbar.error('Nie udało się załadować czatu');
        }
      },
    });

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
      if (
        data.type === 'sendMessage' &&
        data.message?.includes('Brak dostępu do czatu grupowego')
      ) {
        this.snackbar.error('Jesteś zbanowany na czacie tego wydarzenia');
      } else if (data.message) {
        this.snackbar.error(data.message);
      }
    });

    this.bannedSub = this.chatService.onChatBanned().subscribe((banned) => {
      if (banned) {
        this.chatBanned.set(true);
        this.chatDisabled.set(true);
        this.snackbar.error('Jesteś zbanowany na czacie tego wydarzenia');
      }
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
