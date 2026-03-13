import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment, PaginatedPayments, EventEarnings } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class PaymentService {
 private readonly http = inject(HttpClient);
 private readonly apiUrl = environment.apiUrl + '/payments';

 getMyPayments(page = 1, limit = 20): Observable<PaginatedPayments> {
 return this.http.get<PaginatedPayments>(`${this.apiUrl}/my-payments`, {
 params: { page, limit },
 });
 }

 getPaymentStatus(paymentId: string): Observable<Payment> {
 return this.http.get<Payment>(`${this.apiUrl}/${paymentId}/status`);
 }

 getPaymentStatusByIntentId(intentId: string): Observable<Payment> {
 return this.http.get<Payment>(`${this.apiUrl}/intent/${intentId}/status`);
 }

 getEventEarnings(eventId: string): Observable<EventEarnings> {
 return this.http.get<EventEarnings>(`${this.apiUrl}/event/${eventId}/earnings`);
 }

 refundAsVoucher(paymentId: string): Observable<{ success: boolean }> {
 return this.http.post<{ success: boolean }>(`${this.apiUrl}/${paymentId}/refund-voucher`, {});
 }

 refundAsMoney(paymentId: string): Observable<{ success: boolean }> {
 return this.http.post<{ success: boolean }>(`${this.apiUrl}/${paymentId}/refund-money`, {});
 }
}
