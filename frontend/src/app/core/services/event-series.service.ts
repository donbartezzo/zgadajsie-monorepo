import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventSeriesView } from '../../shared/types';
import {
  CreateEventSeriesPayload,
  UpdateEventSeriesPayload,
  EventSeriesPreviewItem,
} from '@zgadajsie/shared';

interface DeactivateResult {
  deactivated: boolean;
  deletedFutureEvents: number;
  remainingEventsWithEnrollments: number;
}

interface PreviewPayload {
  recurrenceType: string;
  intervalDays?: number;
  daysOfWeek?: number[];
  time: string;
  timezone?: string;
  durationMinutes: number;
  startDate: string;
  count?: number;
}

@Injectable({ providedIn: 'root' })
export class EventSeriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/event-series';

  createSeries(payload: CreateEventSeriesPayload): Observable<EventSeriesView> {
    return this.http.post<EventSeriesView>(this.apiUrl, payload);
  }

  getSeries(id: string): Observable<EventSeriesView> {
    return this.http.get<EventSeriesView>(`${this.apiUrl}/${id}`);
  }

  getMine(): Observable<EventSeriesView[]> {
    return this.http.get<EventSeriesView[]>(`${this.apiUrl}/mine`);
  }

  updateSeries(id: string, payload: UpdateEventSeriesPayload): Observable<EventSeriesView> {
    return this.http.patch<EventSeriesView>(`${this.apiUrl}/${id}`, payload);
  }

  deactivate(id: string): Observable<DeactivateResult> {
    return this.http.delete<DeactivateResult>(`${this.apiUrl}/${id}`);
  }

  preview(payload: PreviewPayload): Observable<EventSeriesPreviewItem[]> {
    return this.http.post<EventSeriesPreviewItem[]>(`${this.apiUrl}/preview`, payload);
  }
}
