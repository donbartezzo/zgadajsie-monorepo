import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Conversation, DirectMessage, PaginatedDirectMessages } from '../../shared/types';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class DirectMessageService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private socket: Socket | null = null;
  private messageSubject = new Subject<DirectMessage>();
  private typingSubject = new Subject<{ userId: string; displayName: string }>();

  getOrCreateConversation(
    recipientId: string,
    eventId?: string,
  ): Observable<Conversation> {
    return this.http.post<Conversation>(
      `${environment.apiUrl}/direct-messages/conversations`,
      { recipientId, eventId },
    );
  }

  getMyConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${environment.apiUrl}/direct-messages/conversations`,
    );
  }

  getConversation(conversationId: string): Observable<Conversation> {
    return this.http.get<Conversation>(
      `${environment.apiUrl}/direct-messages/conversations/${conversationId}`,
    );
  }

  getHistory(
    conversationId: string,
    page = 1,
    limit = 50,
  ): Observable<PaginatedDirectMessages> {
    return this.http.get<PaginatedDirectMessages>(
      `${environment.apiUrl}/direct-messages/conversations/${conversationId}/messages`,
      { params: { page, limit } },
    );
  }

  connect(conversationId: string): void {
    if (this.socket) this.disconnect();

    this.socket = io(`${environment.wsUrl}/chat`, {
      auth: { token: this.authService.getAccessToken() },
    });

    this.socket.emit('joinDmRoom', { conversationId });

    this.socket.on('newDirectMessage', (message: DirectMessage) => {
      this.messageSubject.next(message);
    });

    this.socket.on('dmUserTyping', (data: { userId: string; displayName: string }) => {
      this.typingSubject.next(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(conversationId: string, content: string): void {
    const user = this.authService.currentUser();
    if (this.socket && user) {
      this.socket.emit('sendDirectMessage', {
        conversationId,
        senderId: user.id,
        content,
      });
    }
  }

  sendTyping(conversationId: string): void {
    const user = this.authService.currentUser();
    if (this.socket && user) {
      this.socket.emit('dmTyping', {
        conversationId,
        userId: user.id,
        displayName: user.displayName,
      });
    }
  }

  onMessage(): Observable<DirectMessage> {
    return this.messageSubject.asObservable();
  }

  onTyping(): Observable<{ userId: string; displayName: string }> {
    return this.typingSubject.asObservable();
  }
}
