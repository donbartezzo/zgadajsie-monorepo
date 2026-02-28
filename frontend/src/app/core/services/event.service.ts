import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Event, EventListItem, Participation } from '../../shared/types';

interface PaginatedEvents {
  data: EventListItem[];
  total: number;
  page: number;
  limit: number;
}

interface EventQueryParams {
  page?: number;
  limit?: number;
  citySlug?: string;
  disciplineSlug?: string;
  sortBy?: string;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/events';

  getEvents(params?: EventQueryParams): Observable<PaginatedEvents> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.citySlug) httpParams = httpParams.set('citySlug', params.citySlug);
    if (params?.disciplineSlug)
      httpParams = httpParams.set('disciplineSlug', params.disciplineSlug);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    return this.http.get<PaginatedEvents>(this.apiUrl, { params: httpParams });
  }

  getEvent(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  createEvent(data: Partial<Event>): Observable<Event> {
    return this.http.post<Event>(this.apiUrl, data);
  }

  updateEvent(id: string, data: Partial<Event>): Observable<Event> {
    return this.http.patch<Event>(`${this.apiUrl}/${id}`, data);
  }

  cancelEvent(id: string): Observable<Event> {
    return this.http.post<Event>(`${this.apiUrl}/${id}/cancel`, {});
  }

  archiveEvent(id: string): Observable<Event> {
    return this.http.post<Event>(`${this.apiUrl}/${id}/archive`, {});
  }

  duplicateEvent(id: string): Observable<Event> {
    return this.http.post<Event>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  toggleAutoAccept(id: string): Observable<Event> {
    return this.http.patch<Event>(`${this.apiUrl}/${id}/auto-accept`, {});
  }

  getParticipants(eventId: string): Observable<Participation[]> {
    return this.http.get<Participation[]>(`${this.apiUrl}/${eventId}/participants`);
  }

  joinEvent(eventId: string): Observable<Participation> {
    return this.http.post<Participation>(`${this.apiUrl}/${eventId}/join`, {});
  }

  joinGuest(eventId: string, displayName: string): Observable<Participation> {
    return this.http.post<Participation>(`${this.apiUrl}/${eventId}/join-guest`, { displayName });
  }

  leaveEvent(eventId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${eventId}/leave`, {});
  }

  acceptParticipation(participationId: string): Observable<Participation> {
    return this.http.post<Participation>(
      `${environment.apiUrl}/participations/${participationId}/accept`,
      {},
    );
  }

  rejectParticipation(participationId: string): Observable<Participation> {
    return this.http.post<Participation>(
      `${environment.apiUrl}/participations/${participationId}/reject`,
      {},
    );
  }
}
