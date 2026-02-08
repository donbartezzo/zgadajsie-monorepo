import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Wallet, PaginatedTransactions } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/wallets';

  getBalance(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiUrl}/me`);
  }

  getTransactions(page = 1, limit = 20): Observable<PaginatedTransactions> {
    return this.http.get<PaginatedTransactions>(`${this.apiUrl}/me/transactions`, {
      params: { page, limit },
    });
  }

  initTopup(amount: number): Observable<{ transactionId: string; paymentUrl: string }> {
    return this.http.post<{ transactionId: string; paymentUrl: string }>(`${this.apiUrl}/me/topup`, { amount });
  }
}
