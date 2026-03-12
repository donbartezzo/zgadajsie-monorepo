import { computed, Directive, effect, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LayoutConfigService } from '../../../shared/layouts/page-layout/layout-config.service';
import { ChatService } from '../../../core/services/chat.service';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { Event as EventModel, PrivateChatMessage } from '../../../shared/types';
import { ChatViewMessage } from '../../../shared/ui/chat-view/chat-view.component';
import { coverImageUrl } from '../../../shared/types/cover-image.interface';

@Directive()
export abstract class BaseChatComponent implements OnDestroy {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly chatService = inject(ChatService);
  protected readonly eventService = inject(EventService);
  protected readonly auth = inject(AuthService);
  protected readonly snackbar = inject(SnackbarService);
  protected readonly layoutConfig = inject(LayoutConfigService);

  readonly event = signal<EventModel | null>(null);
  readonly privateMessages = signal<PrivateChatMessage[]>([]);
  readonly loading = signal(true);
  readonly typingUser = signal<string | null>(null);
  readonly chatDisabled = signal(false);
  readonly showMembers = signal(false);
  readonly memberCount = signal(0);
  readonly inactiveUsers = signal<Map<string, 'banned' | 'withdrawn'>>(new Map());
  readonly isOrganizer = signal(false);
  readonly organizerId = signal('');

  eventId = '';
  currentUserId = '';

  protected msgSub!: Subscription;
  protected typingSub!: Subscription;
  protected errorSub!: Subscription;
  protected bannedSub!: Subscription;
  protected typingTimeout: ReturnType<typeof setTimeout> | undefined;

  abstract readonly headerTitle: ReturnType<typeof computed<string>>;
  abstract readonly headerSubtitle: ReturnType<typeof computed<string>>;

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

  constructor() {
    effect(() => {
      const filename = this.event()?.coverImage?.filename;
      if (filename) {
        this.layoutConfig.coverImageUrl.set(coverImageUrl(filename));
      }
    });
    effect(() => {
      this.layoutConfig.titleText.set(this.headerTitle());
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    this.errorSub?.unsubscribe();
    this.bannedSub?.unsubscribe();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  onMemberBanned(_userId: string): void {
    this.loadMemberCount();
  }

  onMemberUnbanned(_userId: string): void {
    this.loadMemberCount();
  }

  protected initBaseData(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
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
            if (m.isBanned) {
              inactiveMap.set(m.user.id, 'banned');
            } else if (m.isWithdrawn) {
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
        onHistoryLoaded?.(res.data);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'Brak dostępu do tego czatu';
        this.snackbar.error(msg);
        this.chatDisabled.set(true);
      },
    });

    this.chatService.connectPrivate(this.eventId, otherUserId);

    this.msgSub = this.chatService.onPrivateMessage().subscribe((msg) => {
      this.privateMessages.update((prev) => [...prev, msg]);
    });

    this.typingSub = this.chatService.onPrivateTyping().subscribe((data) => {
      this.handleTypingIndicator(data);
    });
  }
}
