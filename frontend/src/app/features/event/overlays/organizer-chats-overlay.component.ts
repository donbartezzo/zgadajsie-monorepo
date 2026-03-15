import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { IconComponent } from '../../../core/icons/icon.component';
import { UserAvatarComponent } from '../../../shared/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { ChatService } from '../../../core/services/chat.service';
import { OrganizerConversation } from '../../../shared/types';

@Component({
  selector: 'app-organizer-chats-overlay',
  imports: [
    BottomOverlayComponent,
    IconComponent,
    UserAvatarComponent,
    LoadingSpinnerComponent,
    DatePipe,
  ],
  template: `
    <app-bottom-overlay [open]="true" title="Konwersacje prywatne" (closed)="closed.emit()">
      @if (loading()) {
      <div class="py-8 flex justify-center">
        <app-loading-spinner></app-loading-spinner>
      </div>
      } @else if (conversations().length === 0) {
      <div class="text-center py-8">
        <app-icon name="message-circle" size="lg" class="text-neutral-300 mx-auto mb-3"></app-icon>
        <p class="text-sm text-neutral-500">Brak prywatnych konwersacji z uczestnikami</p>
      </div>
      } @else {
      <div class="space-y-1 max-w-lg mx-auto">
        @for (conv of conversations(); track conv.participant.id) {
        <button
          type="button"
          class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors text-left"
          (click)="openChat(conv.participant.id)"
        >
          <app-user-avatar
            [avatarUrl]="conv.participant.avatarUrl"
            [displayName]="conv.participant.displayName"
            size="sm"
          ></app-user-avatar>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-neutral-900 truncate">
                {{ conv.participant.displayName }}
              </p>
              @if (conv.lastMessage) {
              <span class="text-[10px] text-neutral-400 flex-shrink-0">
                {{ conv.lastMessage.createdAt | date : 'dd.MM, HH:mm' }}
              </span>
              }
            </div>
            @if (conv.lastMessage) {
            <p class="text-xs text-neutral-500 truncate">
              @if (conv.lastMessage.isFromOrganizer) {
              <span class="text-neutral-400">Ty: </span>
              }
              {{ conv.lastMessage.content }}
            </p>
            } @if (conv.messageCount > 0) {
            <span
              class="inline-block mt-0.5 text-[10px] bg-primary-50 text-primary-500 px-1.5 py-0.5 rounded-full"
            >
              {{ conv.messageCount }}
              {{ conv.messageCount === 1 ? 'wiadomość' : 'wiadomości' }}
            </span>
            }
          </div>
          <app-icon
            name="chevron-right"
            size="sm"
            class="text-neutral-300 flex-shrink-0"
          ></app-icon>
        </button>
        }
      </div>
      }
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerChatsOverlayComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  readonly eventId = input.required<string>();
  readonly citySlug = input.required<string>();
  readonly closed = output<void>();

  readonly conversations = signal<OrganizerConversation[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.chatService.getOrganizerConversations(this.eventId()).subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openChat(participantId: string): void {
    this.closed.emit();
    this.router.navigate(['/w', this.citySlug(), this.eventId(), 'host-chat', participantId]);
  }
}
