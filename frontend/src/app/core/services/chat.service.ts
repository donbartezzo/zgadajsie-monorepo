import { inject, Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  ChatMessage,
  ChatMembersResponse,
  OrganizerConversation,
  PaginatedMessages,
  PaginatedPrivateMessages,
  PrivateChatMessage,
} from '../../shared/types';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);

  private socket: Socket | null = null;
  private messageSubject = new Subject<ChatMessage>();
  private typingSubject = new Subject<{ userId: string; displayName: string }>();
  private privateMessageSubject = new Subject<PrivateChatMessage>();
  private privateTypingSubject = new Subject<{ userId: string; displayName: string }>();
  private errorMessageSubject = new Subject<{ type: string; message: string }>();
  private readonly socketBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // ─── Group Chat ─────────────────────────────────────────────────────────────

  connect(eventId: string): void {
    if (this.socket) this.disconnect();

    this.ngZone.runOutsideAngular(() => {
      this.socket = this.createSocket();
      this.socket.emit('joinRoom', { eventId });

      this.socket.on('newMessage', (message: ChatMessage) => {
        this.ngZone.run(() => {
          this.messageSubject.next(message);
        });
      });

      this.socket.on('userTyping', (data: { userId: string; displayName: string }) => {
        this.ngZone.run(() => {
          this.typingSubject.next(data);
        });
      });

      this.socket.on('errorMessage', (data: { type: string; message: string }) => {
        this.ngZone.run(() => {
          this.errorMessageSubject.next(data);
        });
      });
    });
  }

  sendMessage(eventId: string, content: string): void {
    const user = this.authService.currentUser();
    if (this.socket && user) {
      this.socket.emit('sendMessage', { eventId, userId: user.id, content });
    }
  }

  sendTyping(eventId: string): void {
    const user = this.authService.currentUser();
    if (this.socket && user) {
      this.socket.emit('typing', { eventId, userId: user.id, displayName: user.displayName });
    }
  }

  onMessage(): Observable<ChatMessage> {
    return this.messageSubject.asObservable();
  }

  onTyping(): Observable<{ userId: string; displayName: string }> {
    return this.typingSubject.asObservable();
  }

  getHistory(eventId: string, page = 1, limit = 50): Observable<PaginatedMessages> {
    return this.http.get<PaginatedMessages>(
      `${environment.apiUrl}/events/${eventId}/chat/messages`,
      { params: { page, limit } },
    );
  }

  // ─── Private Chat (Organizer ↔ Participant) ────────────────────────────────

  connectPrivate(eventId: string, otherUserId: string): void {
    if (this.socket) this.disconnect();

    const user = this.authService.currentUser();
    this.ngZone.runOutsideAngular(() => {
      this.socket = this.createSocket();
      this.socket.emit('joinPrivateRoom', { eventId, otherUserId });

      this.socket.on('newPrivateMessage', (message: PrivateChatMessage) => {
        this.ngZone.run(() => {
          this.privateMessageSubject.next(message);
        });
      });

      this.socket.on('privateUserTyping', (data: { userId: string; displayName: string }) => {
        if (data.userId !== user?.id) {
          this.ngZone.run(() => {
            this.privateTypingSubject.next(data);
          });
        }
      });
    });
  }

  sendPrivateMessage(eventId: string, recipientId: string, content: string): void {
    const user = this.authService.currentUser();
    if (this.socket && user) {
      this.socket.emit('sendPrivateMessage', {
        eventId,
        senderId: user.id,
        recipientId,
        content,
      });
    }
  }

  sendPrivateTyping(eventId: string, otherUserId: string): void {
    const user = this.authService.currentUser();
    if (this.socket && user) {
      this.socket.emit('privateTyping', {
        eventId,
        userId: user.id,
        otherUserId,
        displayName: user.displayName,
      });
    }
  }

  onPrivateMessage(): Observable<PrivateChatMessage> {
    return this.privateMessageSubject.asObservable();
  }

  onPrivateTyping(): Observable<{ userId: string; displayName: string }> {
    return this.privateTypingSubject.asObservable();
  }

  getPrivateHistory(
    eventId: string,
    userId: string,
    page = 1,
    limit = 50,
  ): Observable<PaginatedPrivateMessages> {
    return this.http.get<PaginatedPrivateMessages>(
      `${environment.apiUrl}/events/${eventId}/chat/private/${userId}/messages`,
      { params: { page, limit } },
    );
  }

  getOrganizerConversations(eventId: string): Observable<OrganizerConversation[]> {
    return this.http.get<OrganizerConversation[]>(
      `${environment.apiUrl}/events/${eventId}/chat/private/conversations`,
    );
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  getMembers(eventId: string): Observable<ChatMembersResponse> {
    return this.http.get<ChatMembersResponse>(
      `${environment.apiUrl}/events/${eventId}/chat/members`,
    );
  }

  // ─── Shared ─────────────────────────────────────────────────────────────────

  onErrorMessage(): Observable<{ type: string; message: string }> {
    return this.errorMessageSubject.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private createSocket(): Socket {
    const socket = io(`${this.socketBaseUrl}/chat`, {
      transports: ['websocket'],
      auth: {
        token: this.authService.getAccessToken(),
        userId: this.authService.currentUser()?.id,
      },
    });

    return socket;
  }
}
