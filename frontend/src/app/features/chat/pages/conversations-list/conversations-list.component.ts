import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../../../core/icons/icon.component';
import { UserAvatarComponent } from '../../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { DirectMessageService } from '../../../../core/services/direct-message.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Conversation } from '../../../../shared/types';

@Component({
  selector: 'app-conversations-list',
  imports: [RouterLink, DatePipe, IconComponent, UserAvatarComponent, LoadingSpinnerComponent],
  template: `
    <div class="max-w-2xl mx-auto p-4">
      <header class="flex items-center gap-3 py-3 mb-4">
        <a routerLink="/profile" class="text-gray-500 dark:text-gray-400">
          <app-icon name="arrow-left" size="sm"></app-icon>
        </a>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Wiadomości</h1>
      </header>

      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else if (conversations().length === 0) {
      <div class="text-center py-12">
        <app-icon name="message-circle" size="lg" class="text-gray-300 dark:text-gray-600 mx-auto mb-3"></app-icon>
        <p class="text-sm text-gray-500 dark:text-gray-400">Brak wiadomości</p>
      </div>
      } @else {
      <div class="space-y-1">
        @for (conv of conversationsWithMeta(); track conv.id) {
        <a
          [routerLink]="['/messages', conv.id]"
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <app-user-avatar
            [avatarUrl]="conv.otherUser?.avatarUrl"
            [displayName]="conv.otherUser?.displayName || ''"
            size="sm"
          ></app-user-avatar>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ conv.otherUser?.displayName }}
              </p>
              @if (conv.lastMessageAt) {
              <span class="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                {{ conv.lastMessageAt | date : 'dd.MM, HH:mm' }}
              </span>
              }
            </div>
            @if (conv.lastMessagePreview) {
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ conv.lastMessagePreview }}
            </p>
            }
            @if (conv.eventTitle) {
            <p class="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {{ conv.eventTitle }}
            </p>
            }
          </div>
          <app-icon name="chevron-right" size="sm" class="text-gray-300 dark:text-gray-600 flex-shrink-0"></app-icon>
        </a>
        }
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationsListComponent implements OnInit {
  private readonly dmService = inject(DirectMessageService);
  private readonly auth = inject(AuthService);

  readonly conversations = signal<Conversation[]>([]);
  readonly loading = signal(true);

  readonly conversationsWithMeta = computed(() => {
    const userId = this.auth.currentUser()?.id ?? '';
    return this.conversations().map((conv) => {
      const otherUser = conv.userAId === userId ? conv.userB : conv.userA;
      const lastMsg = conv.messages?.[0];
      return {
        id: conv.id,
        otherUser,
        eventTitle: conv.event?.title ?? null,
        lastMessagePreview: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt ?? null,
      };
    });
  });

  ngOnInit(): void {
    this.dmService.getMyConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
