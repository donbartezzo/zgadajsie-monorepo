import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { City, DictionaryItem, DisciplineSchema } from '@zgadajsie/shared';

@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/dictionaries';
  private readonly cities$ = this.http.get<City[]>(`${this.apiUrl}/cities`).pipe(shareReplay(1));

  getCities(): Observable<City[]> {
    return this.cities$;
  }

  getDisciplines(): Observable<DictionaryItem[]> {
    return this.http.get<DictionaryItem[]>(`${this.apiUrl}/disciplines`);
  }

  getFacilities(): Observable<DictionaryItem[]> {
    return this.http.get<DictionaryItem[]>(`${this.apiUrl}/facilities`);
  }

  getLevels(): Observable<DictionaryItem[]> {
    return this.http.get<DictionaryItem[]>(`${this.apiUrl}/levels`);
  }

  getCityBySlug(slug: string): Observable<City> {
    return this.http.get<City>(`${this.apiUrl}/cities/${slug}`);
  }

  getDisciplineSchema(slug: string): Observable<DisciplineSchema | null> {
    return this.http.get<DisciplineSchema | null>(`${this.apiUrl}/disciplines/${slug}/schema`);
  }
}
