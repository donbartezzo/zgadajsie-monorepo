import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { setRuntimeMediaUrl } from '../../shared/utils/runtime-config.util';

interface ClientConfig {
  mediaUrl?: string;
}

// Ładuje konfigurację runtime z backendu (/api/config). Backend czyta swoje .env
// w runtime, więc mediaUrl (R2_PUBLIC_URL) jest zawsze zgodny ze środowiskiem
// danego kontenera — bez ryzyka, że dev poda URL prod (i odwrotnie).
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly configUrl = environment.apiUrl + '/config';

  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(this.http.get<ClientConfig>(this.configUrl));
      setRuntimeMediaUrl(config?.mediaUrl);
    } catch {
      // Fallback do build-time environment.mediaUrl (obsłużony w getMediaUrl()).
      setRuntimeMediaUrl(null);
    }
  }
}
