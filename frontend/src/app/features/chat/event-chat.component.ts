import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../core/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/auth/auth.service';
import { ChatMessage } from '../../shared/types';

@Component({
  selector: 'app-event-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, IconComponent, ButtonComponent, UserAvatarComponent, LoadingSpinnerComponent],
  template: `
    <div class="flex flex-col h-[calc(100vh-8rem)]">
      <header class="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-slate-700">
        <a [routerLink]="['/events', eventId]" class="text-gray-500 dark:text-gray-400">
          <app-icon name="arrow-left" size="sm"></app-icon>
        </a>
        <h1 class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">Chat wydarzenia</h1>
      </header>

      <div class="flex-1 overflow-y-auto py-4 space-y-3" #messagesContainer>
        @if (loading()) {
          <app-loading-spinner></app-loading-spinner>
        }
        @for (msg of messages(); track msg.id) {
          <div class="flex gap-2" [class]="msg.userId === currentUserId ? 'flex-row-reverse' : ''">
            <app-user-avatar [avatarUrl]="msg.user?.avatarUrl" [displayName]="msg.user?.displayName || ''" size="sm"></app-user-avatar>
            <div [class]="msg.userId === currentUserId
              ? 'bg-blue-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]'">
              <p class="text-xs font-medium mb-0.5 opacity-70">{{ msg.user?.displayName }}</p>
              <p class="text-sm">{{ msg.content }}</p>
              <p class="text-[10px] mt-1 opacity-50">{{ msg.createdAt | date:'HH:mm' }}</p>
            </div>
          </div>
        }
      </div>

      @if (typingUser()) {
        <p class="text-xs text-gray-400 dark:text-gray-500 py-1">{{ typingUser() }} pisze...</p>
      }

      <div class="flex gap-2 py-3 border-t border-gray-200 dark:border-slate-700">
        <input
          [(ngModel)]="newMessage"
          (keyup.enter)="send()"
          (input)="onTyping()"
          placeholder="Napisz wiadomość..."
          class="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <app-button variant="primary" (clicked)="send()">
          <app-icon name="send" size="sm"></app-icon>
        </app-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventChatComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly chatService = inject(ChatService);
  private readonly auth = inject(AuthService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(true);
  readonly typingUser = signal<string | null>(null);
  newMessage = '';
  eventId = '';
  currentUserId = '';

  private msgSub!: Subscription;
  private typingSub!: Subscription;
  private typingTimeout: any;

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id')!;
    this.currentUserId = this.auth.currentUser()?.id || '';

    this.chatService.getHistory(this.eventId).subscribe({
      next: (res) => {
        this.messages.set(res.data.reverse());
        this.loading.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => this.loading.set(false),
    });

    this.chatService.connect(this.eventId);

    this.msgSub = this.chatService.onMessage().subscribe(msg => {
      this.messages.update(prev => [...prev, msg]);
      setTimeout(() => this.scrollToBottom(), 50);
    });

    this.typingSub = this.chatService.onTyping().subscribe(data => {
      if (data.userId !== this.currentUserId) {
        this.typingUser.set(data.displayName);
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => this.typingUser.set(null), 2000);
      }
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.msgSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    clearTimeout(this.typingTimeout);
  }

  send(): void {
    if (!this.newMessage.trim()) return;
    this.chatService.sendMessage(this.eventId, this.newMessage.trim());
    this.newMessage = '';
  }

  onTyping(): void {
    this.chatService.sendTyping(this.eventId);
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}
