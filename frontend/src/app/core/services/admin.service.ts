import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, PaginatedPayments, ContactMessagesResponse } from '../../shared/types';
import { DictionaryItem } from '@zgadajsie/shared';

interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getUsers(page = 1, limit = 20, search?: string): Observable<PaginatedUsers> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedUsers>(`${this.apiUrl}/users`, { params });
  }

  getEvents(page = 1, limit = 20): Observable<PaginatedUsers> {
    return this.http.get<PaginatedUsers>(`${this.apiUrl}/events`, {
      params: { page, limit },
    });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}`, data);
  }

  getUserPayments(userId: string, page = 1, limit = 20): Observable<PaginatedPayments> {
    return this.http.get<PaginatedPayments>(`${this.apiUrl}/payments/admin/all`, {
      params: { page, limit, userId },
    });
  }

  getSettings(): Observable<{ key: string; value: string }[]> {
    return this.http.get<{ key: string; value: string }[]>(`${this.apiUrl}/admin/settings`);
  }

  updateSetting(key: string, value: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/admin/settings/${key}`, { value });
  }

  createDictionary(type: string, data: Partial<DictionaryItem>): Observable<DictionaryItem> {
    return this.http.post<DictionaryItem>(`${this.apiUrl}/admin/${type}`, data);
  }

  updateDictionary(
    type: string,
    id: string,
    data: Partial<DictionaryItem>,
  ): Observable<DictionaryItem> {
    return this.http.patch<DictionaryItem>(`${this.apiUrl}/admin/${type}/${id}`, data);
  }

  deleteDictionary(type: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/${type}/${id}`);
  }

  getCronStatus(): Observable<{ crons: CronStatus[] }> {
    return this.http.get<{ crons: CronStatus[] }>(`${this.apiUrl}/admin/crons`);
  }

  triggerCron(name: string): Observable<{ triggered: boolean; name: string; durationMs: number }> {
    return this.http.post<{ triggered: boolean; name: string; durationMs: number }>(
      `${this.apiUrl}/admin/crons/${name}/trigger`,
      {},
    );
  }

  getCronLogs(
    name: string,
    limit = 20,
    offset = 0,
  ): Observable<{ logs: CronLog[]; total: number; limit: number; offset: number }> {
    return this.http.get<{ logs: CronLog[]; total: number; limit: number; offset: number }>(
      `${this.apiUrl}/admin/crons/${name}/logs`,
      { params: { limit, offset } },
    );
  }

  setEventTargetOccupancy(eventId: string, targetOccupancy: number | null): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/events/${eventId}/target-occupancy`, {
      targetOccupancy,
    });
  }

  setEventTargetOccupancyConfig(
    eventId: string,
    dto: {
      targetOccupancy?: number | null;
      cleanupHours?: number;
      minFreeSlotsBuffer?: number;
    },
  ): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/events/${eventId}/fake-users-config`, dto);
  }

  adminWithdrawUser(enrollmentId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/enrollments/${enrollmentId}/admin-withdraw`, {});
  }

  enrollFakeUserToEvent(eventId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/admin/fake-users/events/${eventId}/enroll`, {});
  }

  verifyUserByOrganizer(targetUserId: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${targetUserId}/verify-by-organizer`, {});
  }

  getContactMessages(page = 1, limit = 20): Observable<ContactMessagesResponse> {
    return this.http.get<ContactMessagesResponse>(`${this.apiUrl}/contact/admin/messages`, {
      params: { page, limit },
    });
  }

  resendContactEmail(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/contact/admin/messages/${id}/resend`,
      {},
    );
  }

  deleteContactMessage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contact/admin/messages/${id}`);
  }

  getPendingEmails(page = 1, limit = 50, type?: string): Observable<PendingEmailsResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (type) params = params.set('type', type);
    return this.http.get<PendingEmailsResponse>(
      `${this.apiUrl}/admin/notifications/pending-emails`,
      {
        params,
      },
    );
  }

  cancelEmailForNotification(notificationId: string): Observable<PendingEmailNotification | null> {
    return this.http.delete<PendingEmailNotification | null>(
      `${this.apiUrl}/admin/notifications/${notificationId}/cancel-email`,
    );
  }
}

export interface CronStatus {
  name: string;
  nextRun: string | null;
  lastRun: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
}

export interface CronLog {
  id: string;
  cronName: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

export interface PendingEmailNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface PendingEmailsResponse {
  data: PendingEmailNotification[];
  total: number;
  page: number;
  limit: number;
}
