import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoverImage } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class CoverImageService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/cover-images';

  getAll(disciplineSlug?: string): Observable<CoverImage[]> {
    let params = new HttpParams();
    if (disciplineSlug) {
      params = params.set('disciplineSlug', disciplineSlug);
    }
    return this.http.get<CoverImage[]>(this.apiUrl, { params });
  }

  getOne(id: string): Observable<CoverImage> {
    return this.http.get<CoverImage>(`${this.apiUrl}/${id}`);
  }

  getUsage(id: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/${id}/usage`);
  }

  create(disciplineSlug: string, file: File): Observable<CoverImage> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('disciplineSlug', disciplineSlug);
    return this.http.post<CoverImage>(this.apiUrl, formData);
  }

  replaceImage(id: string, file: File): Observable<CoverImage> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<CoverImage>(`${this.apiUrl}/${id}/image`, formData);
  }

  updateDiscipline(id: string, disciplineSlug: string): Observable<CoverImage> {
    return this.http.put<CoverImage>(`${this.apiUrl}/${id}/discipline`, { disciplineSlug });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  suggest(disciplineSlug: string, citySlug: string): Observable<CoverImage | null> {
    const params = new HttpParams().set('disciplineSlug', disciplineSlug).set('citySlug', citySlug);
    return this.http.get<CoverImage | null>(`${this.apiUrl}/suggest`, { params });
  }

  // Galeria własna użytkownika
  getMy(): Observable<CoverImage[]> {
    return this.http.get<CoverImage[]>(`${this.apiUrl}/my`);
  }

  createMy(file: File, name: string): Observable<CoverImage> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return this.http.post<CoverImage>(`${this.apiUrl}/my`, formData);
  }

  renameMy(id: string, name: string): Observable<CoverImage> {
    return this.http.patch<CoverImage>(`${this.apiUrl}/my/${id}`, { name });
  }

  replaceMyImage(id: string, file: File): Observable<CoverImage> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<CoverImage>(`${this.apiUrl}/my/${id}/image`, formData);
  }

  removeMy(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/my/${id}`);
  }

  getMyUsage(id: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/my/${id}/usage`);
  }
}
