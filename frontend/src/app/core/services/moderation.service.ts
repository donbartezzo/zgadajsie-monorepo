import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/moderation';

  createReprimand(toUserId: string, eventId: string, reason: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/reprimands`, { toUserId, eventId, reason });
  }

  getReprimands(userId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/reprimands/${userId}`);
  }

  createBan(userId: string, reason?: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/bans`, { userId, reason });
  }

  removeBan(banId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bans/${banId}`);
  }

  getBans(page = 1, limit = 20): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/bans`, { params: { page, limit } });
  }
}
