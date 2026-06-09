import { environment } from '../../../environments/environment';

// mediaUrl pochodzi z backendowego /api/config (źródło: R2_PUBLIC_URL z .env backendu),
// ładowanego w APP_INITIALIZER przez AppConfigService. Dany backend czyta swoje .env
// w runtime, więc dev→dev bucket, prod→prod bucket — niemożliwe pomieszanie środowisk.
// Fallback do build-time environment.mediaUrl gdy config jeszcze/nie udało się załadować.
let runtimeMediaUrl: string | null = null;

export function setRuntimeMediaUrl(url: string | null | undefined): void {
  runtimeMediaUrl = url && url.length > 0 ? url : null;
}

export function getMediaUrl(): string {
  return runtimeMediaUrl ?? environment.mediaUrl ?? '';
}
