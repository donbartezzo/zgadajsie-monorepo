import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OrganizerUserRelation,
  OrganizerUserRelationListResponse,
} from '../../shared/types/moderation.interface';

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

  banUser(userId: string, reason?: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/ban`, { userId, reason });
  }

  unbanUser(targetUserId: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/ban/${targetUserId}`);
  }

  trustUser(targetUserId: string): Observable<OrganizerUserRelation> {
    return this.http.post<OrganizerUserRelation>(`${this.apiUrl}/trust/${targetUserId}`, {});
  }

  untrustUser(targetUserId: string): Observable<OrganizerUserRelation> {
    return this.http.delete<OrganizerUserRelation>(`${this.apiUrl}/trust/${targetUserId}`);
  }

  getRelations(page = 1, limit = 20): Observable<OrganizerUserRelationListResponse> {
    return this.http.get<OrganizerUserRelationListResponse>(`${this.apiUrl}/relations`, {
      params: { page, limit },
    });
  }

  getRelation(targetUserId: string): Observable<OrganizerUserRelation | null> {
    return this.http.get<OrganizerUserRelation | null>(`${this.apiUrl}/relation/${targetUserId}`);
  }
}
