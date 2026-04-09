import { inject, Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { EventRealtimeInvalidationPayload, EventRealtimeRoomPayload } from '@zgadajsie/shared';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class EventRealtimeService {
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly socketBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  private socket: Socket | null = null;
  private readonly invalidationSubject = new Subject<EventRealtimeInvalidationPayload>();

  onInvalidation(): Observable<EventRealtimeInvalidationPayload> {
    return this.invalidationSubject.asObservable();
  }

  connect(eventId: string): void {
    if (this.socket) {
      this.disconnect();
    }

    this.ngZone.runOutsideAngular(() => {
      this.socket = io(`${this.socketBaseUrl}/events`, {
        transports: ['websocket'],
        auth: {
          token: this.authService.getAccessToken(),
          userId: this.authService.currentUser()?.id,
        },
      });

      this.socket.on('connect', () => {
        this.subscribeToEvent(eventId);
      });

      this.socket.on('event:invalidated', (payload: EventRealtimeInvalidationPayload) => {
        this.ngZone.run(() => {
          this.invalidationSubject.next(payload);
        });
      });
    });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  private subscribeToEvent(eventId: string): void {
    if (!this.socket) {
      return;
    }

    const payload: EventRealtimeRoomPayload = { eventId };
    this.socket.emit('subscribe', payload);
  }
}
