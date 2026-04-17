import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Event,
  EventListItem,
  Enrollment,
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

  getEnrollments(eventId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.apiUrl}/${eventId}/enrollments`);
  }

  /** @deprecated Use getEnrollments */
  getParticipants(eventId: string): Observable<Enrollment[]> {
    return this.getEnrollments(eventId);
  }

  joinEvent(
    eventId: string,
    roleKey?: string,
  ): Observable<Enrollment & { isPaid?: boolean; costPerPerson?: number }> {
    const body = roleKey ? { roleKey } : {};
    return this.http.post<Enrollment & { isPaid?: boolean; costPerPerson?: number }>(
      `${this.apiUrl}/${eventId}/join`,
      body,
    );
  }

  payEnrollment(
    enrollmentId: string,
  ): Observable<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    return this.http.post<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/pay`,
      {},
    );
  }

  /** @deprecated Use payEnrollment */
  payParticipation(
    enrollmentId: string,
  ): Observable<{ paymentUrl?: string; paymentId?: string; paidByVoucher?: boolean }> {
    return this.payEnrollment(enrollmentId);
  }

  joinGuest(eventId: string, displayName: string, roleKey?: string): Observable<Enrollment> {
    const body: JoinGuestRequest = { displayName };
    if (roleKey) {
      body.roleKey = roleKey;
    }
    return this.http.post<Enrollment>(`${this.apiUrl}/${eventId}/join-guest`, body);
  }

  updateGuestName(enrollmentId: string, displayName: string): Observable<UpdateGuestResponse> {
    return this.http.patch<UpdateGuestResponse>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/update-guest`,
      { displayName },
    );
  }

  changeEnrollmentRole(
    enrollmentId: string,
    roleKey: string,
  ): Observable<Enrollment & { isPaid?: boolean; costPerPerson?: number }> {
    return this.http.patch<Enrollment & { isPaid?: boolean; costPerPerson?: number }>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/role`,
      { roleKey },
    );
  }

  /** @deprecated Use changeEnrollmentRole */
  changeParticipationRole(
    enrollmentId: string,
    roleKey: string,
  ): Observable<Enrollment & { isPaid?: boolean; costPerPerson?: number }> {
    return this.changeEnrollmentRole(enrollmentId, roleKey);
  }

  rejoinEnrollment(enrollmentId: string): Observable<Enrollment> {
    return this.http.post<Enrollment>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/rejoin`,
      {},
    );
  }

  /** @deprecated Use rejoinEnrollment */
  rejoinParticipation(enrollmentId: string): Observable<Enrollment> {
    return this.rejoinEnrollment(enrollmentId);
  }

  leaveEnrollment(enrollmentId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/enrollments/${enrollmentId}/leave`, {});
  }

  /** @deprecated Use leaveEnrollment */
  leaveParticipation(enrollmentId: string): Observable<void> {
    return this.leaveEnrollment(enrollmentId);
  }

  assignSlot(enrollmentId: string): Observable<Enrollment> {
    return this.http.post<Enrollment>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/assign-slot`,
      {},
    );
  }

  confirmSlot(enrollmentId: string): Observable<Enrollment> {
    return this.http.post<Enrollment>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/confirm-slot`,
      {},
    );
  }

  releaseSlot(enrollmentId: string): Observable<Enrollment> {
    return this.http.post<Enrollment>(
      `${environment.apiUrl}/enrollments/${enrollmentId}/release-slot`,
      {},
    );
  }

  deleteEnrollment(enrollmentId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/enrollments/${enrollmentId}`);
  }

  /** @deprecated Use deleteEnrollment */
  deleteParticipation(enrollmentId: string): Observable<void> {
    return this.deleteEnrollment(enrollmentId);
  }

  getMyGuests(eventId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.apiUrl}/${eventId}/my-guests`);
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  markAsPaid(eventId: string, enrollmentId: string): Observable<Enrollment[]> {
    return this.http.post<Enrollment[]>(
      `${this.apiUrl}/${eventId}/mark-paid/${enrollmentId}`,
      {},
    );
  }

  cancelPayment(
    eventId: string,
    paymentId: string,
    options: CancelPaymentRequest,
  ): Observable<Enrollment[]> {
    return this.http.post<Enrollment[]>(
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

  assignToSlot(slotId: string, enrollmentId: string): Observable<unknown> {
    return this.http.post(
      `${environment.apiUrl}/slots/${slotId}/assign-to-slot/${enrollmentId}`,
      {},
    );
  }

  /** @deprecated Use assignToSlot */
  assignParticipantToSlot(slotId: string, enrollmentId: string): Observable<unknown> {
    return this.assignToSlot(slotId, enrollmentId);
  }
}
