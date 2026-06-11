import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DisciplineProfile,
  ParticipantStats,
  UpsertDisciplineProfileRequest,
} from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class DisciplineProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/discipline-profiles';
  private readonly usersUrl = environment.apiUrl + '/users';

  getMine(): Observable<DisciplineProfile[]> {
    return this.http.get<DisciplineProfile[]>(`${this.apiUrl}/me`);
  }

  getMineForDiscipline(disciplineSlug: string): Observable<DisciplineProfile | null> {
    return this.http.get<DisciplineProfile | null>(`${this.apiUrl}/me/${disciplineSlug}`);
  }

  upsert(
    disciplineSlug: string,
    payload: UpsertDisciplineProfileRequest,
  ): Observable<DisciplineProfile> {
    return this.http.put<DisciplineProfile>(`${this.apiUrl}/me/${disciplineSlug}`, payload);
  }

  getMyStats(): Observable<ParticipantStats> {
    return this.http.get<ParticipantStats>(`${this.usersUrl}/me/stats`);
  }
}
