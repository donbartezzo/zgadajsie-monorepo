import { signal } from '@angular/core';
import { environment } from '../../../environments/environment';

// mediaUrl pochodzi z backendowego /api/config (źródło: R2_PUBLIC_URL z .env backendu),
// ładowanego NIEBLOKUJĄCO w tle przez AppConfigService. Dany backend czyta swoje .env
// w runtime, więc dev→dev bucket, prod→prod bucket — niemożliwe pomieszanie środowisk.
// Do czasu odpowiedzi używany jest build-time environment.mediaUrl (poprawny per-build).
// Sygnał sprawia, że gdy wartość dotrze, computed/effect z buildCoverImageUrl odświeżą URL.
const runtimeMediaUrl = signal<string | null>(null);

export function setRuntimeMediaUrl(url: string | null | undefined): void {
  runtimeMediaUrl.set(url && url.length > 0 ? url : null);
}

export function getMediaUrl(): string {
  return runtimeMediaUrl() ?? environment.mediaUrl ?? '';
}
