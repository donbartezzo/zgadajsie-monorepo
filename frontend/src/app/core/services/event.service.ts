import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Event, EventListItem, Participation, ParticipantManageItem } from '../../shared/types';

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

  duplicateEvent(id: string): Observable<Event> {
    return this.http.post<Event>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  getParticipants(eventId: string): Observable<Participation[]> {
    return this.http.get<Participation[]>(`${this.apiUrl}/${eventId}/participants`);
  }

  joinEvent(
    eventId: string,
    roleKey?: string,
  ): Observable<Participation & { isPaid?: boolean; costPerPerson?: number }> {
    const body = roleKey ? { roleKey } : {};
    return this.http.post<Participation & { isPaid?: boolean; costPerPerson?: number }>(
      `${this.apiUrl}/${eventId}/join`,
      body,
    );
  }

  payParticipation(
    participationId: string,
  ): Observable<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    return this.http.post<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }>(
      `${environment.apiUrl}/participations/${participationId}/pay`,
      {},
    );
  }

  joinGuest(eventId: string, displayName: string): Observable<Participation> {
    return this.http.post<Participation>(`${this.apiUrl}/${eventId}/join-guest`, { displayName });
  }

  updateGuestName(
    participationId: string,
    displayName: string,
  ): Observable<{ id: string; displayName: string }> {
    return this.http.patch<{ id: string; displayName: string }>(
      `${environment.apiUrl}/participations/${participationId}/update-guest`,
      { displayName },
    );
  }

  leaveParticipation(participationId: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/participations/${participationId}/leave`,
      {},
    );
  }

  assignSlot(participationId: string): Observable<Participation> {
    return this.http.post<Participation>(
      `${environment.apiUrl}/participations/${participationId}/assign-slot`,
      {},
    );
  }

  confirmSlot(participationId: string): Observable<Participation> {
    return this.http.post<Participation>(
      `${environment.apiUrl}/participations/${participationId}/confirm-slot`,
      {},
    );
  }

  releaseSlot(participationId: string): Observable<Participation> {
    return this.http.post<Participation>(
      `${environment.apiUrl}/participations/${participationId}/release-slot`,
      {},
    );
  }

  getMyGuests(eventId: string): Observable<Participation[]> {
    return this.http.get<Participation[]>(`${this.apiUrl}/${eventId}/my-guests`);
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getParticipantsManage(eventId: string): Observable<ParticipantManageItem[]> {
    return this.http.get<ParticipantManageItem[]>(`${this.apiUrl}/${eventId}/participants/manage`);
  }

  markAsPaid(eventId: string, participationId: string): Observable<ParticipantManageItem[]> {
    return this.http.post<ParticipantManageItem[]>(
      `${this.apiUrl}/${eventId}/mark-paid/${participationId}`,
      {},
    );
  }

  cancelPayment(
    eventId: string,
    paymentId: string,
    options: { refundAsVoucher: boolean; notifyUser: boolean },
  ): Observable<ParticipantManageItem[]> {
    return this.http.post<ParticipantManageItem[]>(
      `${this.apiUrl}/${eventId}/cancel-payment/${paymentId}`,
      options,
    );
  }
}
