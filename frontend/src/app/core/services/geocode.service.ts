import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map, of } from 'rxjs';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeocodeService {
  private readonly http = inject(HttpClient);
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  searchAddress(query: string): Observable<GeocodeResult[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    // @TODO: ograniczenia tylk na Polskę
    const params = {
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'pl',
      'accept-language': 'pl',
    };

    return this.http.get<any[]>(this.nominatimUrl, { params }).pipe(
      map((results) =>
        results.map((item) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
        })),
      ),
    );
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address || address.trim().length < 3) {
      return null;
    }

    try {
      const results = await firstValueFrom(this.searchAddress(address));
      return results.length > 0 ? results[0] : null;
    } catch {
      return null;
    }
  }
}
