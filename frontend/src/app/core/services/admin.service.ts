import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, Wallet, PaginatedTransactions, DictionaryItem } from '../../shared/types';

interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(page = 1, limit = 20, search?: string): Observable<PaginatedUsers> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedUsers>(`${this.apiUrl}/users`, { params });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}`, data);
  }

  getUserWallet(userId: string): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiUrl}/wallets/${userId}`);
  }

  getUserTransactions(userId: string, page = 1, limit = 20): Observable<PaginatedTransactions> {
    return this.http.get<PaginatedTransactions>(`${this.apiUrl}/wallets/${userId}/transactions`, {
      params: { page, limit },
    });
  }

  adjustWallet(userId: string, amount: number, description?: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/wallets/${userId}/adjust`, { amount, description });
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

  updateDictionary(type: string, id: string, data: Partial<DictionaryItem>): Observable<DictionaryItem> {
    return this.http.patch<DictionaryItem>(`${this.apiUrl}/admin/${type}/${id}`, data);
  }

  deleteDictionary(type: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/${type}/${id}`);
  }
}
