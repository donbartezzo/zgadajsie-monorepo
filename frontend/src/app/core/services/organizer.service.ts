import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EventDigestItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  enrollmentCount: number;
  seriesId: string | null;
  seriesName: string | null;
  confirmToken: string | null;
}

export interface SeriesDigestItem {
  id: string;
  name: string;
  recurrenceType: string;
  isActive: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  pendingCount: number;
  nextEventAt: string | null;
}

export interface OrganizerDigestData {
  period: { from: string; to: string };
  pendingConfirmations: EventDigestItem[];
  recentlyCreated: EventDigestItem[];
  recentlyEnded: EventDigestItem[];
  upcoming: EventDigestItem[];
  recentlyCancelled: EventDigestItem[];
  activeSeries: SeriesDigestItem[];
  recentlyDeactivatedSeries: SeriesDigestItem[];
}

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
