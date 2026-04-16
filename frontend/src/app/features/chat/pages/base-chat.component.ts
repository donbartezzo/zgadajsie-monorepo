import { computed, Directive, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { PrivateChatMessage } from '../../../shared/types';
import { ChatViewMessage } from '../../../shared/chat/ui/chat-view/chat-view.component';
import { EventAreaService } from '../../event/services/event-area.service';
import { isChatAccessDeniedError } from '../../../shared/utils';

@Directive()
export abstract class BaseChatComponent implements OnDestroy {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly chatService = inject(ChatService);
  protected readonly auth = inject(AuthService);
  protected readonly snackbar = inject(SnackbarService);
  protected readonly eventArea = inject(EventAreaService);

  // Delegated from EventAreaService
  readonly event = this.eventArea.event;

  // Local chat state
  readonly privateMessages = signal<PrivateChatMessage[]>([]);
  readonly loading = signal(true);
  readonly typingUser = signal<string | null>(null);
  readonly chatDisabled = signal(false);
  readonly chatAccessDenied = signal(false);
  readonly showMembers = signal(false);
  readonly memberCount = signal(0);
  readonly inactiveUsers = signal<Map<string, 'banned' | 'withdrawn'>>(new Map());
  readonly isOrganizer = signal(false);
  readonly organizerId = signal('');

  get eventId(): string {
    return this.eventArea.eventId;
  }

  currentUserId = '';

  protected msgSub!: Subscription;
  protected typingSub!: Subscription;
  protected errorSub!: Subscription;
  protected typingTimeout: ReturnType<typeof setTimeout> | undefined;

  readonly privateChatViewMessages = computed<ChatViewMessage[]>(() =>
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

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    this.errorSub?.unsubscribe();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  protected initBaseData(): void {
    // eventId is now a getter from EventAreaService
    this.currentUserId = this.auth.currentUser()?.id ?? '';
  }

  protected loadMemberCount(): void {
    this.chatService.getMembers(this.eventId).subscribe({
      next: (res) => {
        if (res?.members) {
          const organizerInMembers = res.members.some((m) => m.user.id === res.organizer.id);
          this.memberCount.set(res.members.length + (organizerInMembers ? 0 : 1));

          const inactiveMap = new Map<string, 'banned' | 'withdrawn'>();
          res.members.forEach((m) => {
            if (m.isWithdrawn) {
              inactiveMap.set(m.user.id, 'withdrawn');
            }
          });
          this.inactiveUsers.set(inactiveMap);
        }
      },
    });
  }

  protected handleTypingIndicator(data: { userId: string; displayName: string }): void {
    this.typingUser.set(data.displayName);
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.typingTimeout = setTimeout(() => this.typingUser.set(null), 2000);
  }

  protected initPrivateChatBase(
    otherUserId: string,
    onHistoryLoaded?: (data: PrivateChatMessage[]) => void,
  ): void {
    this.chatService.getPrivateHistory(this.eventId, otherUserId).subscribe({
      next: (res) => {
        this.privateMessages.set(res.data);
        this.loading.set(false);
        this.chatService.connectPrivate(this.eventId, otherUserId);

        this.msgSub = this.chatService.onPrivateMessage().subscribe((msg) => {
          this.privateMessages.update((prev) => [...prev, msg]);
        });

        this.typingSub = this.chatService.onPrivateTyping().subscribe((data) => {
          this.handleTypingIndicator(data);
        });

        onHistoryLoaded?.(res.data);
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
}
