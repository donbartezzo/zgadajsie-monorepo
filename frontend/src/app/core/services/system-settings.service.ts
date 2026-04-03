import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SystemSettings, AuthorizedOrganizer } from '../../shared/types/system-settings.interface';
import { City } from '../../shared/types/dictionary.interface';

interface AddAuthorizedOrganizerData {
  userId: string;
}

interface CanCreateEventResponse {
  canCreate: boolean;
}

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/system-settings';

  getSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}`);
  }

  getAdminSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}/admin`);
  }

  updateEventCreationRestricted(restricted: boolean): Observable<SystemSettings> {
    return this.http.patch<SystemSettings>(`${this.apiUrl}/admin/event-creation-restricted`, {
      restricted,
    });
  }

  updateOnlinePaymentsDisabled(disabled: boolean): Observable<SystemSettings> {
    return this.http.patch<SystemSettings>(`${this.apiUrl}/admin/online-payments-disabled`, {
      disabled,
    });
  }

  getAuthorizedOrganizers(): Observable<AuthorizedOrganizer[]> {
    return this.http.get<AuthorizedOrganizer[]>(`${this.apiUrl}/admin/authorized-organizers`);
  }

  addAuthorizedOrganizer(data: AddAuthorizedOrganizerData): Observable<AuthorizedOrganizer> {
    return this.http.post<AuthorizedOrganizer>(`${this.apiUrl}/admin/authorized-organizers`, data);
  }

  canCurrentUserCreateEvents(): Observable<boolean> {
    return this.http
      .get<CanCreateEventResponse>(`${this.apiUrl}/can-create-event`)
      .pipe(map((response) => response.canCreate));
  }

  removeAuthorizedOrganizer(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/authorized-organizers/${userId}`);
  }

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${environment.apiUrl}/dictionaries/cities`);
  }

  getAllUsers(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${environment.apiUrl}/users`)
      .pipe(map((response) => response.data));
  }
}
