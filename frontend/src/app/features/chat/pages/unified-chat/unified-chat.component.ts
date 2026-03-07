import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../../../core/icons/icon.component';
import { EventHeroComponent } from '../../../../shared/ui/event-hero/event-hero.component';
import { ChatService } from '../../../../core/services/chat.service';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ChatMessage, PrivateChatMessage, Event as EventModel } from '../../../../shared/types';
import {
  ChatViewComponent,
  ChatViewMessage,
} from '../../../../shared/ui/chat-view/chat-view.component';
import { ChatMembersOverlayComponent } from '../../overlays/chat-members-overlay.component';

@Component({
  selector: 'app-unified-chat',
  imports: [
    RouterLink,
    IconComponent,
    EventHeroComponent,
    ChatViewComponent,
    ChatMembersOverlayComponent,
  ],
  host: { class: 'flex-1 flex flex-col min-h-0', style: '--hero-h: 180px' },
  template: `
    <app-event-hero [event]="event()" />

    <div
      class="relative z-10 -mt-6 flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
    >
      <header
        class="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700"
      >
        <a [routerLink]="['/events', eventId]" class="text-gray-500 dark:text-gray-400">
          <app-icon name="arrow-left" size="sm"></app-icon>
        </a>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ chatTitle() }}
          </h2>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {{ isPrivate ? 'Wiadomość prywatna' : 'Grupowy' }}
          </p>
        </div>
        <button
          type="button"
          class="relative grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
      </header>

      <div class="flex-1 flex flex-col min-h-0">
        <app-chat-view
          [messages]="chatViewMessages()"
          [currentUserId]="currentUserId"
          [loading]="loading()"
          [typingUser]="typingUser()"
          [inactiveUsers]="inactiveUsers()"
          (messageSent)="send($event)"
          (typing)="onTyping()"
        ></app-chat-view>
      </div>
    </div>

    @if (showMembers()) {
    <app-chat-members-overlay
      [eventId]="eventId"
      [isOrganizer]="isOrganizer()"
      [organizerId]="organizerId()"
      [otherUserId]="isPrivate ? otherUserId : ''"
      (closed)="showMembers.set(false)"
      (memberBanned)="onMemberBanned($event)"
      (memberUnbanned)="onMemberUnbanned($event)"
    ></app-chat-members-overlay>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnifiedChatComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly chatService = inject(ChatService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);

  readonly event = signal<EventModel | null>(null);
  readonly groupMessages = signal<ChatMessage[]>([]);
  readonly privateMessages = signal<PrivateChatMessage[]>([]);
  readonly loading = signal(true);
  readonly typingUser = signal<string | null>(null);
  readonly showMembers = signal(false);
  readonly otherUserName = signal('');
  readonly isOrganizer = signal(false);
  readonly organizerId = signal('');
  readonly memberCount = signal(0);
  readonly inactiveUsers = signal<Map<string, 'banned' | 'withdrawn'>>(new Map());

  eventId = '';
  otherUserId = '';
  currentUserId = '';
  isPrivate = false;

  readonly chatTitle = computed(() => {
    if (this.isPrivate) {
      return this.otherUserName() || 'Wiadomość prywatna';
    }
    return 'Chat wydarzenia';
  });

  readonly chatViewMessages = computed<ChatViewMessage[]>(() => {
    if (this.isPrivate) {
      return this.privateMessages().map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender
          ? {
              id: msg.sender.id,
              displayName: msg.sender.displayName,
              avatarUrl: msg.sender.avatarUrl,
            }
          : undefined,
      }));
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

  private msgSub!: Subscription;
  private typingSub!: Subscription;
  private typingTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.otherUserId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.currentUserId = this.auth.currentUser()?.id ?? '';
    this.isPrivate = !!this.otherUserId;

    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.organizerId.set(e.organizerId);
        this.isOrganizer.set(e.organizerId === this.currentUserId);

        if (this.isPrivate) {
          const isOrg = e.organizer?.id === this.currentUserId;
          if (!isOrg) {
            this.otherUserName.set(e.organizer?.displayName ?? 'Organizator');
          }
        }
      },
    });

    this.loadMemberCount();

    if (this.isPrivate) {
      this.initPrivateChat();
    } else {
      this.initGroupChat();
    }
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
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

  onMemberBanned(_userId: string): void {
    this.loadMemberCount();
  }

  onMemberUnbanned(_userId: string): void {
    this.loadMemberCount();
  }

  private loadMemberCount(): void {
    this.chatService.getMembers(this.eventId).subscribe({
      next: (res) => {
        if (this.isPrivate) {
          this.memberCount.set(2);
        } else {
          // Check if organizer is already in members (has participation)
          const organizerInMembers = res.members.some((m) => m.user.id === res.organizer.id);
          this.memberCount.set(res.members.length + (organizerInMembers ? 0 : 1));
        }

        // Build inactive users map
        const inactiveMap = new Map<string, 'banned' | 'withdrawn'>();
        res.members.forEach((m) => {
          if (m.isBanned) {
            inactiveMap.set(m.user.id, 'banned');
          } else if (m.isWithdrawn) {
            inactiveMap.set(m.user.id, 'withdrawn');
          }
        });
        this.inactiveUsers.set(inactiveMap);
      },
    });
  }

  // ─── Private init ──────────────────────────────────────────────────────────

  private initPrivateChat(): void {
    this.chatService.getPrivateHistory(this.eventId, this.otherUserId).subscribe({
      next: (res) => {
        this.privateMessages.set(res.data);
        this.loading.set(false);
        this.setOtherUserNameFromMessages(res.data);
      },
      error: () => this.loading.set(false),
    });

    this.chatService.connectPrivate(this.eventId, this.otherUserId);

    this.msgSub = this.chatService.onPrivateMessage().subscribe((msg) => {
      this.privateMessages.update((prev) => [...prev, msg]);
    });

    this.typingSub = this.chatService.onPrivateTyping().subscribe((data) => {
      this.handleTypingIndicator(data);
    });
  }

  private initGroupChat(): void {
    this.chatService.getHistory(this.eventId).subscribe({
      next: (res) => {
        this.groupMessages.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
  }

  private handleTypingIndicator(data: { userId: string; displayName: string }): void {
    this.typingUser.set(data.displayName);
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.typingTimeout = setTimeout(() => this.typingUser.set(null), 2000);
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
