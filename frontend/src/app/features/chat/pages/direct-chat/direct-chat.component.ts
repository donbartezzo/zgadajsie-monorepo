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
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { DirectMessageService } from '../../../../core/services/direct-message.service';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Conversation, DirectMessage, Event as EventModel } from '../../../../shared/types';
import {
  ChatViewComponent,
  ChatViewMessage,
} from '../../../../shared/ui/chat-view/chat-view.component';

@Component({
  selector: 'app-direct-chat',
  imports: [
    RouterLink,
    IconComponent,
    EventHeroComponent,
    ChatViewComponent,
    LoadingSpinnerComponent,
  ],
  host: { class: 'flex-1 flex flex-col min-h-0', style: '--hero-h: 180px' },
  template: `
    <app-event-hero [event]="event()" />

    <!-- Pull-up card with chat -->
    <div
      class="relative z-10 -mt-6 flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
    >
      @if (conversationLoading()) {
      <div class="flex-1 flex items-center justify-center">
        <app-loading-spinner></app-loading-spinner>
      </div>
      } @else {
      <header
        class="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700"
      >
        @if (conversation()?.eventId) {
        <a
          [routerLink]="['/events', conversation()?.eventId]"
          class="text-gray-500 dark:text-gray-400"
        >
          <app-icon name="arrow-left" size="sm"></app-icon>
        </a>
        } @else {
        <a routerLink="/messages" class="text-gray-500 dark:text-gray-400">
          <app-icon name="arrow-left" size="sm"></app-icon>
        </a>
        }
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ otherUserName() }}
          </h2>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Wiadomość prywatna
          </p>
        </div>
      </header>

      <div class="flex-1 flex flex-col min-h-0">
        <app-chat-view
          [messages]="chatViewMessages()"
          [currentUserId]="currentUserId"
          [loading]="messagesLoading()"
          [typingUser]="typingUser()"
          (messageSent)="send($event)"
          (typing)="onTyping()"
        ></app-chat-view>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectChatComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly dmService = inject(DirectMessageService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);

  readonly event = signal<EventModel | null>(null);
  readonly conversation = signal<Conversation | null>(null);
  readonly messages = signal<DirectMessage[]>([]);
  readonly conversationLoading = signal(true);
  readonly messagesLoading = signal(true);
  readonly typingUser = signal<string | null>(null);
  currentUserId = '';

  readonly otherUserName = computed(() => {
    const conv = this.conversation();
    if (!conv) return '';
    return conv.userAId === this.currentUserId
      ? conv.userB?.displayName ?? ''
      : conv.userA?.displayName ?? '';
  });

  readonly chatViewMessages = computed<ChatViewMessage[]>(() =>
    this.messages().map((msg) => ({
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
    })),
  );

  private msgSub!: Subscription;
  private typingSub!: Subscription;
  private typingTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser()?.id ?? '';
    const conversationId = this.route.snapshot.paramMap.get('conversationId') ?? '';

    this.dmService.getConversation(conversationId).subscribe({
      next: (conv) => {
        this.conversation.set(conv);
        this.conversationLoading.set(false);
        this.loadMessages(conversationId);
        this.dmService.connect(conversationId);
        this.setupSocketListeners();

        if (conv.eventId) {
          this.eventService.getEvent(conv.eventId).subscribe({
            next: (e) => this.event.set(e),
          });
        }
      },
      error: () => {
        this.conversationLoading.set(false);
        this.messagesLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.dmService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  send(content: string): void {
    const conv = this.conversation();
    if (conv) {
      this.dmService.sendMessage(conv.id, content);
    }
  }

  onTyping(): void {
    const conv = this.conversation();
    if (conv) {
      this.dmService.sendTyping(conv.id);
    }
  }

  private loadMessages(conversationId: string): void {
    this.dmService.getHistory(conversationId).subscribe({
      next: (res) => {
        this.messages.set(res.data);
        this.messagesLoading.set(false);
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  private setupSocketListeners(): void {
    this.msgSub = this.dmService.onMessage().subscribe((msg) => {
      this.messages.update((prev) => [...prev, msg]);
    });

    this.typingSub = this.dmService.onTyping().subscribe((data) => {
      if (data.userId !== this.currentUserId) {
        this.typingUser.set(data.displayName);
        if (this.typingTimeout) clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => this.typingUser.set(null), 2000);
      }
    });
  }
}
