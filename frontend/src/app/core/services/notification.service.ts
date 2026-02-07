import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedNotifications } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = environment.apiUrl + '/notifications';

  unreadCount = signal(0);

  constructor(private http: HttpClient) {}

  getNotifications(page = 1, limit = 20): Observable<PaginatedNotifications> {
    return this.http.get<PaginatedNotifications>(this.apiUrl, {
      params: { page, limit },
    });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/read-all`, {});
  }

  fetchUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).subscribe({
      next: (res) => this.unreadCount.set(res.count),
      error: () => this.unreadCount.set(0),
    });
  }

  subscribeToPush(subscription: PushSubscription): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/push/subscribe`, subscription.toJSON());
  }

  unsubscribeFromPush(endpoint: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/push/unsubscribe`, { endpoint });
  }
}
