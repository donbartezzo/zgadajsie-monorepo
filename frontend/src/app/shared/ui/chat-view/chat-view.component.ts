import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../button/button.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

export interface ChatViewMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

@Component({
  selector: 'app-chat-view',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    IconComponent,
    ButtonComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
  ],
  host: { class: 'flex-1 min-h-0' },
  template: `
    <div class="overflow-y-auto px-3 py-4 pb-20 space-y-3" style="height: calc(100vh - 290px)" #messagesContainer>
      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @for (msg of messages(); track msg.id) {
      <div [class]="'flex gap-2 ' + (msg.senderId === currentUserId() ? 'flex-row-reverse' : '')">
        <app-user-avatar
          [avatarUrl]="msg.sender?.avatarUrl"
          [displayName]="msg.sender?.displayName || ''"
          size="sm"
        ></app-user-avatar>
        <div
          [class]="
            msg.senderId === currentUserId()
              ? 'bg-highlight text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]'
          "
        >
          <p class="text-xs font-medium mb-0.5 opacity-70">{{ msg.sender?.displayName }}</p>
          <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
          <p class="text-[10px] mt-1 opacity-50">{{ msg.createdAt | date : 'HH:mm' }}</p>
        </div>
      </div>
      }
    </div>

    @if (typingUser()) {
    <p class="text-xs text-gray-400 dark:text-gray-500 px-3 py-1">{{ typingUser() }} pisze...</p>
    }

    <div
      class="fixed bottom-16 inset-x-0 z-20 mx-auto max-w-app border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
    >
      <div class="flex mb-3 gap-2 px-3 py-3">
        <input
          [(ngModel)]="newMessage"
          (keyup.enter)="send()"
          (input)="onTyping()"
          placeholder="Napisz wiadomość..."
          class="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"
        />
        <app-button variant="primary" (clicked)="send()">
          <app-icon name="send" size="sm"></app-icon>
        </app-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatViewComponent {
  readonly messages = input.required<ChatViewMessage[]>();
  readonly currentUserId = input.required<string>();
  readonly loading = input(false);
  readonly typingUser = input<string | null>(null);

  readonly messageSent = output<string>();
  readonly typing = output<void>();

  readonly messagesContainer = viewChild<ElementRef>('messagesContainer');

  newMessage = '';

  constructor() {
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  send(): void {
    if (!this.newMessage.trim()) return;
    this.messageSent.emit(this.newMessage.trim());
    this.newMessage = '';
    // Also scroll immediately after sending
    setTimeout(() => this.scrollToBottom(), 150);
  }

  onTyping(): void {
    this.typing.emit();
  }

  scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
