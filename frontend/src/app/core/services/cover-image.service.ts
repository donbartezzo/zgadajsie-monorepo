import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoverImage } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class CoverImageService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/cover-images';

  getAll(disciplineId?: string): Observable<CoverImage[]> {
    let params = new HttpParams();
    if (disciplineId) {
      params = params.set('disciplineId', disciplineId);
    }
    return this.http.get<CoverImage[]>(this.apiUrl, { params });
  }

  getOne(id: string): Observable<CoverImage> {
    return this.http.get<CoverImage>(`${this.apiUrl}/${id}`);
  }

  getUsage(id: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/${id}/usage`);
  }

  create(disciplineId: string, file: File): Observable<CoverImage> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('disciplineId', disciplineId);
    return this.http.post<CoverImage>(this.apiUrl, formData);
  }

  replaceImage(id: string, file: File): Observable<CoverImage> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<CoverImage>(`${this.apiUrl}/${id}/image`, formData);
  }

  updateDiscipline(id: string, disciplineId: string): Observable<CoverImage> {
    return this.http.put<CoverImage>(`${this.apiUrl}/${id}/discipline`, { disciplineId });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
