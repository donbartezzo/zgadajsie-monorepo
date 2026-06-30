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
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { LoadingSpinnerComponent } from '../../../ui/loading-spinner/loading-spinner.component';
import {
  UserAvatarListComponent,
  UserAvatarListItem,
} from '../../../ui/user-avatar-list/user-avatar-list.component';
import { UserBrief } from '../../../types';
import { NavigationService } from '../../../../core/services/navigation.service';
import { PluralPipe } from '../../../pipes/plural.pipe';

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
    UserAvatarListComponent,
    PluralPipe,
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
      @let _msgs = messages();
      @let _isLoading = loading();
      @let _mbrs = members();

      <!-- ─── Chat header ─── (fixed na mobile; od lg in-flow, by trzymać kolumnę główną boxa) -->
      <div
        class="fixed lg:static top-app mt-[var(--hero-mini-bar-h)] lg:mt-0 left-0 right-0 z-10 flex items-center px-4 py-0.5 border-b border-neutral-200 bg-white w-full max-w-app mx-auto"
      >
        <div class="flex items-center w-full gap-3 mr-10">
          <div class="flex items-center gap-3 shrink-0">
            <h2 class="text-sm font-semibold text-neutral-900">{{ chatTitle() }}</h2>
            @if (_mbrs.length > 0) {
              <span class="hidden sm:block text-xs text-neutral-400"
                >{{ _mbrs.length }} {{ _mbrs.length | translatePlural: 'chat.participants' }}</span
              >
            }
          </div>
          <app-user-avatar-list
            [items]="_mbrs"
            [citySlug]="citySlug()"
            [eventId]="eventId()"
            [showButton]="false"
            align="end"
            class="ml-auto min-w-0"
          ></app-user-avatar-list>
        </div>
      </div>

      <!-- ─── Messages area ─── -->
      <div class="relative flex flex-1 flex-col min-h-0">
        @if (_msgs.length === 0 && !_isLoading) {
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-3 text-center z-10 pointer-events-none"
          >
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100">
              <app-icon name="message-circle" size="md" class="text-neutral-300"></app-icon>
            </div>
            <p class="text-sm text-neutral-500">
              @if (isPrivate()) {
                Rozpocznij rozmowę z organizatorem
              } @else {
                Bądź pierwszy i napisz wiadomość na czacie grupowym
              }
            </p>
          </div>
        }

        <!-- Scrollable messages -->
        <div
          class="flex flex-1 flex-col min-h-0 overflow-y-auto px-4 py-4 space-y-3 pt-14 lg:pt-4"
          #messagesContainer
        >
          @if (_isLoading) {
            <app-loading-spinner></app-loading-spinner>
          }
          @for (msg of _msgs; track msg.id) {
            @let isInactive = inactiveUsers().has(msg.senderId);
            <div
              [class]="'flex gap-2 ' + (msg.senderId === currentUserId() ? 'flex-row-reverse' : '')"
            >
              @if (msg.sender) {
                <app-user-avatar
                  [user]="msg.sender"
                  size="sm"
                  [class.opacity-40]="isInactive"
                ></app-user-avatar>
              }
              <div
                data-clarity-mask="True"
                [class]="
                  msg.senderId === currentUserId()
                    ? 'bg-primary-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]'
                    : 'bg-neutral-100 text-neutral-900 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]'
                "
              >
                <div class="flex items-center gap-2 mb-0.5">
                  @if (msg.sender) {
                    <p class="text-xs font-medium opacity-70" [class.opacity-40]="isInactive">
                      {{ msg.sender.displayName }}
                    </p>
                  }
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
      </div>

      @if (typingUser()) {
        <p class="text-xs text-neutral-400 px-3 py-1">{{ typingUser() }} pisze...</p>
      }

      <!-- RWD-19: fixed na mobile; od lg in-flow (na dole kolumny głównej boxa).
           w-full — bez niego mx-auto na flex-item kurczy div do treści (input nie na całą szerokość). -->
      <div
        class="fixed lg:static bottom-app inset-x-0 z-20 mx-auto w-full max-w-app border-t border-neutral-200 bg-white"
      >
        <div class="flex gap-2 px-3 py-3">
          <input
            [(ngModel)]="newMessage"
            (keyup.enter)="send()"
            (input)="onTyping()"
            autocomplete="off"
            enterkeyhint="send"
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
  private readonly navigation = inject(NavigationService);

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
  readonly chatTitle = input('');
  readonly members = input<UserAvatarListItem[]>([]);
  readonly organizer = input<UserBrief | null>(null);

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
    this.navigation.navigateToEventOrganizerChat(this.eventId(), this.citySlug());
  }

  navigateToEvent(): void {
    this.navigation.navigateToEventDetail(this.eventId(), this.citySlug());
  }

  scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) {
      el.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
