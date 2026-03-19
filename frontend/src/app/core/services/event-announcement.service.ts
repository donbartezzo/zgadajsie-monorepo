import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventAnnouncementsResponse, AnnouncementReceiptStats } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class EventAnnouncementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAnnouncements(eventId: string): Observable<EventAnnouncementsResponse> {
    return this.http.get<EventAnnouncementsResponse>(
      `${this.apiUrl}/events/${eventId}/announcements`,
    );
  }

  createAnnouncement(
    eventId: string,
    message: string,
    priority = 'INFORMATIONAL',
  ): Observable<{ announcementId: string; dispatchedTo: number }> {
    return this.http.post<{ announcementId: string; dispatchedTo: number }>(
      `${this.apiUrl}/events/${eventId}/announcements`,
      { message, priority },
    );
  }

  confirmManual(announcementId: string): Observable<{ confirmed: boolean; confirmedAt: string }> {
    return this.http.post<{ confirmed: boolean; confirmedAt: string }>(
      `${this.apiUrl}/announcements/${announcementId}/confirm`,
      {},
    );
  }

  confirmByToken(token: string): Observable<{ confirmed: boolean; confirmedAt: string }> {
    return this.http.get<{ confirmed: boolean; confirmedAt: string }>(
      `${this.apiUrl}/announcements/confirm/${token}`,
    );
  }

  confirmAllForEvent(eventId: string): Observable<{ confirmed: number; confirmedAt: string }> {
    return this.http.post<{ confirmed: number; confirmedAt: string }>(
      `${this.apiUrl}/announcements/confirm-all/${eventId}`,
      {},
    );
  }

  getStats(announcementId: string): Observable<AnnouncementReceiptStats> {
    return this.http.get<AnnouncementReceiptStats>(
      `${this.apiUrl}/announcements/${announcementId}/stats`,
    );
  }
}
