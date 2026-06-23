import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrganizerDigestData } from '@zgadajsie/shared';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrganizerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/organizer';

  getDigest(): Observable<OrganizerDigestData> {
    return this.http.get<OrganizerDigestData>(`${this.apiUrl}/digest`);
  }

  sendDigestEmail(): Observable<{ sent: boolean }> {
    return this.http.post<{ sent: boolean }>(`${this.apiUrl}/digest/send-email`, {});
  }
}
