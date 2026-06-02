import { inject, Injectable, NgZone, effect } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { NavigationService } from './navigation.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { io, Socket } from 'socket.io-client';
import type { Notification } from '../../shared/types/notification.interface';

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  groupKey?: string;
  aggregateCount: number;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  relevanceUntil?: string;
  deleteAfter: string;
  relatedEventId?: string;
}

@Injectable({ providedIn: 'root' })
export class UserNotificationSocketService {
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly navigation = inject(NavigationService);
  private readonly snackbar = inject(SnackbarService);
  private readonly ngZone = inject(NgZone);

  private socket: Socket | null = null;
  private isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.init();
    }
  }

  private init(): void {
    // Auto-connect when user logs in, disconnect when logs out
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.auth.getAccessToken();
    if (!token) {
      return;
    }

    const socketBaseUrl = window.location.origin;

    this.ngZone.runOutsideAngular(() => {
      this.socket = io(`${socketBaseUrl}/user-notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.ngZone.run(() => {
          this.notificationService.fetchUnreadCount();
        });
      });

      this.socket.on('disconnect', () => {
        // Socket disconnected
      });

      this.socket.on('notification', (payload: NotificationPayload) => {
        this.ngZone.run(() => {
          this.handleNotification(payload);
        });
      });

      this.socket.on('connect_error', (error: Error) => {
        console.warn('[UserNotificationSocket] connect_error:', error.message);
      });
    });
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleNotification(payload: NotificationPayload): void {
    const notification: Notification = {
      id: payload.id,
      userId: this.auth.currentUser()?.id || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: payload.type as any,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      groupKey: payload.groupKey,
      aggregateCount: payload.aggregateCount,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      readAt: payload.readAt,
      relevanceUntil: payload.relevanceUntil,
      deleteAfter: payload.deleteAfter,
      relatedEventId: payload.relatedEventId,
    };

    // Set live notification signal for UI to merge
    this.notificationService.liveNotification.set(notification);

    // Upsert logic — inkrementuj licznik tylko dla nowych, nie dla debounce updateów
    const existing = this.notificationService.findById(notification.id);
    if (existing) {
      this.notificationService.updateInCache(notification.id, notification);
    } else {
      this.notificationService.addToCache(notification);
      if (!notification.readAt) {
        this.notificationService.unreadCount.update((count) => count + 1);
      }
    }

    // Show snackbar with click action if link exists
    const onClick = payload.link
      ? () => {
          if (payload.link) {
            this.navigation.navigateToUrl(payload.link);
          }
        }
      : undefined;
    this.snackbar.show(payload.title, 'info', 4000, onClick);
  }
}
