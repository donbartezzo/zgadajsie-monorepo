import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoverImage } from '../../shared/types';

export interface CoverImagesSyncReport {
  summary: {
    totalFolders: number;
    totalFiles: number;
    added: number;
    existing: number;
    missingFilesInDb: number;
  };
  byDiscipline: Array<{
    slug: string;
    disciplineId?: string;
    files: Array<{
      filename: string;
      existed: boolean;
      added: boolean;
      fileExists: boolean;
      coverId?: string;
    }>;
  }>;
  dbWithMissingFiles: Array<{
    id: string;
    filename: string;
    disciplineId: string;
    disciplineSlug?: string;
  }>;
}

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

  syncFromFilesystem(): Observable<CoverImagesSyncReport> {
    return this.http.post<CoverImagesSyncReport>(`${this.apiUrl}/sync`, {});
  }
}
