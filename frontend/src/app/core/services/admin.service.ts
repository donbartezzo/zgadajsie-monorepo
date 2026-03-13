import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, PaginatedPayments, DictionaryItem } from '../../shared/types';

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
}
