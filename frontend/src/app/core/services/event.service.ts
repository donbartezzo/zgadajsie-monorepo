import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Event,
  EventListItem,
  Participation,
  EventSlotInfo,
  JoinGuestRequest,
  UpdateGuestResponse,
  CancelPaymentRequest,
  LockSlotResponse,
} from '../../shared/types';

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

  getEventForDuplication(id: string): Observable<Event> {
    // Specjalny endpoint który weryfikuje, czy użytkownik jest właścicielem wydarzenia
    return this.http.get<Event>(`${this.apiUrl}/${id}/duplicate`);
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

  joinGuest(eventId: string, displayName: string, roleKey?: string): Observable<Participation> {
    const body: JoinGuestRequest = { displayName };
    if (roleKey) {
      body.roleKey = roleKey;
    }
    return this.http.post<Participation>(`${this.apiUrl}/${eventId}/join-guest`, body);
  }

  updateGuestName(participationId: string, displayName: string): Observable<UpdateGuestResponse> {
    return this.http.patch<UpdateGuestResponse>(
      `${environment.apiUrl}/participations/${participationId}/update-guest`,
      { displayName },
    );
  }

  rejoinParticipation(participationId: string): Observable<Participation> {
    return this.http.post<Participation>(
      `${environment.apiUrl}/participations/${participationId}/rejoin`,
      {},
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

  markAsPaid(eventId: string, participationId: string): Observable<Participation[]> {
    return this.http.post<Participation[]>(
      `${this.apiUrl}/${eventId}/mark-paid/${participationId}`,
      {},
    );
  }

  cancelPayment(
    eventId: string,
    paymentId: string,
    options: CancelPaymentRequest,
  ): Observable<Participation[]> {
    return this.http.post<Participation[]>(
      `${this.apiUrl}/${eventId}/cancel-payment/${paymentId}`,
      options,
    );
  }

  getSlots(eventId: string): Observable<EventSlotInfo[]> {
    return this.http.get<EventSlotInfo[]>(`${this.apiUrl}/${eventId}/slots`);
  }

  lockSlot(slotId: string): Observable<LockSlotResponse> {
    return this.http.post<LockSlotResponse>(`${environment.apiUrl}/slots/${slotId}/lock`, {});
  }

  unlockSlot(slotId: string): Observable<LockSlotResponse> {
    return this.http.post<LockSlotResponse>(`${environment.apiUrl}/slots/${slotId}/unlock`, {});
  }

  assignParticipantToSlot(slotId: string, participationId: string): Observable<unknown> {
    return this.http.post(
      `${environment.apiUrl}/slots/${slotId}/assign-participant/${participationId}`,
      {},
    );
  }
}
