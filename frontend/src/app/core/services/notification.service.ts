import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedNotifications } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class NotificationService {
 private readonly http = inject(HttpClient);
 private readonly apiUrl = environment.apiUrl + '/notifications';

 unreadCount = signal(0);

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

 async initPushSubscription(): Promise<void> {
 if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
 const vapidKey = environment.vapidPublicKey;
 if (!vapidKey) return;

 try {
 const registration = await navigator.serviceWorker.ready;
 let subscription = await registration.pushManager.getSubscription();
 if (!subscription) {
 subscription = await registration.pushManager.subscribe({
 userVisibleOnly: true,
 applicationServerKey: this.urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
 });
 }
 this.subscribeToPush(subscription).subscribe();
 } catch (err) {
 console.error('Push subscription failed:', err);
 }
 }

 private urlBase64ToUint8Array(base64String: string): Uint8Array {
 const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
 const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
 const rawData = window.atob(base64);
 const outputArray = new Uint8Array(rawData.length);
 for (let i = 0; i < rawData.length; ++i) {
 outputArray[i] = rawData.charCodeAt(i);
 }
 return outputArray;
 }
}
