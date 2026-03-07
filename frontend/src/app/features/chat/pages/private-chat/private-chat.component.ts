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
import { PrivateChatMessage, Event as EventModel } from '../../../../shared/types';
import {
  ChatViewComponent,
  ChatViewMessage,
} from '../../../../shared/ui/chat-view/chat-view.component';

@Component({
  selector: 'app-private-chat',
  imports: [RouterLink, IconComponent, EventHeroComponent, ChatViewComponent],
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
          [loading]="loading()"
          [typingUser]="typingUser()"
          (messageSent)="send($event)"
          (typing)="onTyping()"
        ></app-chat-view>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateChatComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly chatService = inject(ChatService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);

  readonly event = signal<EventModel | null>(null);
  readonly messages = signal<PrivateChatMessage[]>([]);
  readonly loading = signal(true);
  readonly typingUser = signal<string | null>(null);
  readonly otherUserName = signal('');
  eventId = '';
  otherUserId = '';
  currentUserId = '';

  readonly chatViewMessages = computed<ChatViewMessage[]>(() =>
    this.messages().map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt,
      sender: msg.sender
        ? { id: msg.sender.id, displayName: msg.sender.displayName, avatarUrl: msg.sender.avatarUrl }
        : undefined,
    })),
  );

  private msgSub!: Subscription;
  private typingSub!: Subscription;
  private typingTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.otherUserId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.currentUserId = this.auth.currentUser()?.id ?? '';

    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        const isOrganizer = e.organizer?.id === this.currentUserId;
        if (isOrganizer) {
          this.loadOtherUserName();
        } else {
          this.otherUserName.set(e.organizer?.displayName ?? 'Organizator');
        }
      },
    });

    this.chatService.getPrivateHistory(this.eventId, this.otherUserId).subscribe({
      next: (res) => {
        this.messages.set(res.data);
        this.loading.set(false);
        this.setOtherUserNameFromMessages(res.data);
      },
      error: () => this.loading.set(false),
    });

    this.chatService.connectPrivate(this.eventId, this.otherUserId);

    this.msgSub = this.chatService.onPrivateMessage().subscribe((msg) => {
      this.messages.update((prev) => [...prev, msg]);
    });

    this.typingSub = this.chatService.onPrivateTyping().subscribe((data) => {
      this.typingUser.set(data.displayName);
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => this.typingUser.set(null), 2000);
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  send(content: string): void {
    this.chatService.sendPrivateMessage(this.eventId, this.otherUserId, content);
  }

  onTyping(): void {
    this.chatService.sendPrivateTyping(this.eventId, this.otherUserId);
  }

  private loadOtherUserName(): void {
    // Name will be set from message history or fetched participant data
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
