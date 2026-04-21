import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner.component';
import { UserBrief } from '../../../types';

export interface ChatViewMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: UserBrief;
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
  host: { class: 'flex flex-col flex-1 min-h-0 pb-[var(--footer-height)]' },
  template: `
    @if (disabled()) {
      <div class="flex flex-1 flex-col items-center justify-center px-6 text-center gap-4">
        <div class="flex items-center justify-center w-14 h-14 rounded-full bg-danger-50">
          <app-icon name="shield-alert" size="lg" class="text-danger-300"></app-icon>
        </div>
        <h3 class="text-lg font-semibold text-neutral-900">Zostałeś zbanowany na czacie</h3>
        <p class="text-sm text-neutral-500 max-w-xs">
          Nie masz dostępu do czatu grupowego tego wydarzenia. W celu wyjaśnienia skontaktuj się z
          organizatorem.
        </p>
        @if (eventId() && organizerId()) {
          <button
            type="button"
            class="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-primary-500/90 transition-colors"
            (click)="navigateToOrganizer()"
          >
            <app-icon name="send" size="sm"></app-icon>
            Napisz do organizatora
          </button>
        }
      </div>
    } @else if (accessDenied()) {
      <div class="flex flex-1 flex-col items-center justify-center px-6 text-center gap-4">
        <div class="flex items-center justify-center w-14 h-14 rounded-full bg-warning-50">
          <app-icon name="lock" size="lg" class="text-warning-300"></app-icon>
        </div>
        <h3 class="text-lg font-semibold text-neutral-900">
          @if (isPrivate()) {
            Aby napisać do organizatora, dołącz do wydarzenia
          } @else {
            Aby pisać na czacie, dołącz do wydarzenia
          }
        </h3>
        <p class="text-sm text-neutral-500 max-w-xs">
          @if (isPrivate()) {
            Prywatny kontakt z organizatorem jest dostępny tylko dla uczestników. Dołącz do
            wydarzenia, a potem wróć do rozmowy.
          } @else {
            Czat grupowy wydarzenia jest dostępny wyłącznie dla uczestników. Dołącz do wydarzenia,
            aby rozmawiać z organizatorem i innymi uczestnikami.
          }
        </p>
        @if (eventId()) {
          <button
            type="button"
            class="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-primary-500/90 transition-colors"
            (click)="navigateToEvent()"
          >
            <app-icon name="calendar" size="sm"></app-icon>
            Przejdź do wydarzenia
          </button>
        }
      </div>
    } @else {
      <div
        class="flex flex-1 flex-col min-h-0 overflow-y-auto px-4 py-4 space-y-3"
        #messagesContainer
      >
        @if (loading()) {
          <app-loading-spinner></app-loading-spinner>
        }
        @for (msg of messages(); track msg.id) {
          @let isInactive = inactiveUsers().has(msg.senderId);
          <div
            [class]="'flex gap-2 ' + (msg.senderId === currentUserId() ? 'flex-row-reverse' : '')"
          >
            <app-user-avatar
              [avatarUrl]="msg.sender?.avatarUrl"
              [displayName]="msg.sender?.displayName || ''"
              size="sm"
              [class.opacity-40]="isInactive"
            ></app-user-avatar>
            <div
              data-clarity-mask="True"
              [class]="
                msg.senderId === currentUserId()
                  ? 'bg-primary-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]'
                  : 'bg-neutral-100 text-neutral-900 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]'
              "
            >
              <div class="flex items-center gap-2 mb-0.5">
                <p class="text-xs font-medium opacity-70" [class.opacity-40]="isInactive">
                  {{ msg.sender?.displayName }}
                </p>
                @if (isInactive) {
                  <span
                    [class]="
                      'inline-block text-[10px] px-1.5 py-0.5 rounded-md font-medium opacity-40 ' +
                      (inactiveUsers().get(msg.senderId) === 'banned'
                        ? 'bg-danger-50 text-danger-500'
                        : 'bg-warning-50 text-warning-400')
                    "
                  >
                    @switch (inactiveUsers().get(msg.senderId)) {
                      @case ('banned') {
                        Zbanowany na czacie
                      }
                      @case ('withdrawn') {
                        Wypisany z wydarzenia
                      }
                    }
                  </span>
                }
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
              <p class="text-[10px] mt-1 opacity-50">{{ msg.createdAt | date: 'HH:mm' }}</p>
            </div>
          </div>
        }
      </div>

      @if (typingUser()) {
        <p class="text-xs text-neutral-400 px-3 py-1">{{ typingUser() }} pisze...</p>
      }

      <div
        class="fixed bottom-[var(--footer-height)] inset-x-0 z-20 mx-auto max-w-app border-t border-neutral-200 bg-white"
      >
        <div class="flex gap-2 px-3 py-3">
          <input
            [(ngModel)]="newMessage"
            (keyup.enter)="send()"
            (input)="onTyping()"
            placeholder="Napisz wiadomość..."
            class="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
          <app-button appearance="soft" color="primary" (clicked)="send()">
            <app-icon name="send" size="sm"></app-icon>
          </app-button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatViewComponent {
  private readonly router = inject(Router);

  readonly messages = input.required<ChatViewMessage[]>();
  readonly currentUserId = input.required<string>();
  readonly loading = input(false);
  readonly typingUser = input<string | null>(null);
  readonly inactiveUsers = input<Map<string, 'banned' | 'withdrawn'>>(new Map());
  readonly disabled = input(false);
  readonly accessDenied = input(false);
  readonly eventId = input('');
  readonly organizerId = input('');
  readonly citySlug = input('');
  readonly isPrivate = input(false);

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
  }

  onTyping(): void {
    this.typing.emit();
  }

  navigateToOrganizer(): void {
    this.router.navigate(['/w', this.citySlug(), this.eventId(), 'host-chat']);
  }

  navigateToEvent(): void {
    this.router.navigate(['/w', this.citySlug(), this.eventId()]);
  }

  scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) {
      el.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
