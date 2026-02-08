import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, Event, Participation } from '../../shared/types';

interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/users';

  updateProfile(data: UpdateProfileData): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/me`, data);
  }

  getMyEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}/me/events`);
  }

  getMyParticipations(): Observable<Participation[]> {
    return this.http.get<Participation[]>(`${this.apiUrl}/me/participations`);
  }

  getMyReprimands(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/me/reprimands`);
  }
}
