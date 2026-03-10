import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../../../core/icons/icon.component';
import { EventSubpageLayoutComponent } from '../../../../shared/ui/event-subpage-layout/event-subpage-layout.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import {
  ChatViewComponent,
  ChatViewMessage,
} from '../../../../shared/ui/chat-view/chat-view.component';
import { ChatService } from '../../../../core/services/chat.service';
import { EventService } from '../../../../core/services/event.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import {
  Event as EventModel,
  OrganizerConversation,
  PrivateChatMessage,
} from '../../../../shared/types';

@Component({
  selector: 'app-host-chat',
  imports: [
    DatePipe,
    IconComponent,
    EventSubpageLayoutComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    ChatViewComponent,
  ],
  template: `
    <app-event-subpage-layout
      [event]="event()"
      [title]="title()"
      [subtitle]="isOrganizerMode() ? 'Organizator' : 'Wiadomość prywatna'"
    >
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
            class="text-gray-300 dark:text-gray-600 mx-auto mb-3"
          ></app-icon>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Brak prywatnych konwersacji z uczestnikami
          </p>
        </div>
        } @else {
        <div class="space-y-1">
          @for (conv of conversations(); track conv.participant.id) {
          <button
            type="button"
            class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
            (click)="openChat(conv.participant.id)"
          >
            <app-user-avatar
              [avatarUrl]="conv.participant.avatarUrl"
              [displayName]="conv.participant.displayName"
              size="sm"
            ></app-user-avatar>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ conv.participant.displayName }}
                </p>
                @if (conv.lastMessage) {
                <span class="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {{ conv.lastMessage.createdAt | date: 'dd.MM, HH:mm' }}
                </span>
                }
              </div>
              @if (conv.lastMessage) {
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                @if (conv.lastMessage.isFromOrganizer) {
                <span class="text-gray-400 dark:text-gray-500">Ty: </span>
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
              class="text-gray-300 dark:text-gray-600 flex-shrink-0"
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
          [messages]="chatViewMessages()"
          [currentUserId]="currentUserId"
          [loading]="loading()"
          [typingUser]="typingUser()"
          [disabled]="chatDisabled()"
          (messageSent)="send($event)"
          (typing)="onTyping()"
        ></app-chat-view>
      </div>
      }
    </app-event-subpage-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostChatComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);

  readonly event = signal<EventModel | null>(null);
  readonly conversations = signal<OrganizerConversation[]>([]);
  readonly privateMessages = signal<PrivateChatMessage[]>([]);
  readonly loading = signal(true);
  readonly typingUser = signal<string | null>(null);
  readonly isOrganizerMode = signal(false);
  readonly otherUserName = signal('');
  readonly chatDisabled = signal(false);

  currentUserId = '';
  private eventId = '';
  private organizerId = '';

  readonly title = computed(() => {
    if (this.isOrganizerMode()) {
      return 'Konwersacje prywatne';
    }
    return this.otherUserName() || 'Wiadomość prywatna';
  });

  readonly chatViewMessages = computed<ChatViewMessage[]>(() =>
    this.privateMessages().map((msg) => ({
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
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.currentUserId = this.auth.currentUser()?.id ?? '';

    this.eventService.getEvent(this.eventId).subscribe({
      next: (e) => {
        this.event.set(e);
        this.organizerId = e.organizerId;

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
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  openChat(participantId: string): void {
    this.router.navigate(['/events', this.eventId, 'host-chat', participantId]);
  }

  send(content: string): void {
    this.chatService.sendPrivateMessage(this.eventId, this.organizerId, content);
  }

  onTyping(): void {
    this.chatService.sendPrivateTyping(this.eventId, this.organizerId);
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
    this.chatService.getPrivateHistory(this.eventId, this.organizerId).subscribe({
      next: (res) => {
        this.privateMessages.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Brak dostępu do tego czatu';
        this.snackbar.error(msg);
        this.chatDisabled.set(true);
      },
    });

    this.chatService.connectPrivate(this.eventId, this.organizerId);

    this.msgSub = this.chatService.onPrivateMessage().subscribe((msg) => {
      this.privateMessages.update((prev) => [...prev, msg]);
    });

    this.typingSub = this.chatService.onPrivateTyping().subscribe((data) => {
      this.typingUser.set(data.displayName);
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }
      this.typingTimeout = setTimeout(() => this.typingUser.set(null), 2000);
    });
  }
}
