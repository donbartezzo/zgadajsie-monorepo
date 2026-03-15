import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CitySubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/cities';

  isSubscribed(cityId: string): Observable<{ subscribed: boolean }> {
    return this.http.get<{ subscribed: boolean }>(`${this.apiUrl}/${cityId}/subscription`);
  }

  subscribe(cityId: string): Observable<{ subscribed: boolean }> {
    return this.http.post<{ subscribed: boolean }>(`${this.apiUrl}/${cityId}/subscribe`, {});
  }

  unsubscribe(cityId: string): Observable<{ subscribed: boolean }> {
    return this.http.delete<{ subscribed: boolean }>(`${this.apiUrl}/${cityId}/subscribe`);
  }
}
