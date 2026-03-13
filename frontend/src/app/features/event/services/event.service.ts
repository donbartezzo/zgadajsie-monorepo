import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EventDetail {
 id: string;
 title: string;
 category: string;
 dateShort: string;
 dateFull: string;
 subtitle: string;
 location: string;
 organiserName: string;
 organiserRole: string;
 attendeesCount: number;
 scheduleDateLabel: string;
 scheduleTimeLabel: string;
 placeCountry: string;
 placeAddress: string;
 ticketPrice: string;
}

export type EventListItem = Pick<EventDetail, 'id' | 'title'> & {
 date: string;
 location: string;
 attendeesCount: number;
};

@Injectable({ providedIn: 'root' })
export class EventService {
 private readonly http = inject(HttpClient);
 private readonly baseUrl = '/api';

 getEvent(id: string): Observable<EventDetail> {
 return this.http.get<EventDetail>(`${this.baseUrl}/events/${id}`);
 }

 getAllEvents(): Observable<EventListItem[]> {
 return this.http.get<EventListItem[]>(`${this.baseUrl}/events`);
 }

 joinEvent(id: string): Observable<void> {
 return this.http.post<void>(`${this.baseUrl}/events/${id}/join`, {});
 }

 followEvent(id: string): Observable<void> {
 return this.http.post<void>(`${this.baseUrl}/events/${id}/follow`, {});
 }
}
