import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrganizerVoucherGroup } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/vouchers';

  getMyVouchers(): Observable<OrganizerVoucherGroup[]> {
    return this.http.get<OrganizerVoucherGroup[]>(`${this.apiUrl}/my`);
  }

  getBalance(organizerId: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/balance/${organizerId}`);
  }
}
