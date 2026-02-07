import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { City, DictionaryItem } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private apiUrl = environment.apiUrl + '/dictionaries';

  constructor(private http: HttpClient) {}

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.apiUrl}/cities`);
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
}
