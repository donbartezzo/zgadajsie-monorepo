import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MediaFile {
  id: string;
  userId: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/media';

  upload(file: File): Observable<MediaFile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MediaFile>(`${this.apiUrl}/upload`, formData);
  }

  getMyMedia(): Observable<MediaFile[]> {
    return this.http.get<MediaFile[]>(`${this.apiUrl}/me`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
