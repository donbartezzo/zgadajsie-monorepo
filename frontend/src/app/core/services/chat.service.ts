import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ChatMessage, PaginatedMessages } from '../../shared/types';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private socket: Socket | null = null;
  private messageSubject = new Subject<ChatMessage>();
  private typingSubject = new Subject<{ userId: string; displayName: string }>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  connect(eventId: string): void {
    if (this.socket) this.disconnect();

    this.socket = io(`${environment.wsUrl}/chat`, {
      auth: { token: this.authService.getAccessToken() },
    });

    this.socket.emit('joinRoom', { eventId });

    this.socket.on('newMessage', (message: ChatMessage) => {
      this.messageSubject.next(message);
    });

    this.socket.on('userTyping', (data: { userId: string; displayName: string }) => {
      this.typingSubject.next(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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
    return this.http.get<PaginatedMessages>(`${environment.apiUrl}/events/${eventId}/chat/messages`, {
      params: { page, limit },
    });
  }
}
