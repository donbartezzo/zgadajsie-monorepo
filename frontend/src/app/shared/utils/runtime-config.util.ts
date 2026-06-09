import { environment } from '../../../environments/environment';

interface AppRuntimeConfig {
  mediaUrl?: string;
}

// docker-entrypoint.sh podstawia ${MEDIA_URL} do index.html przy starcie kontenera.
// Gdy env nie jest ustawiony, placeholder pozostaje niezmieniony — wtedy używamy
// wartości build-time. Dzięki temu dany kontener nigdy nie poda URL innego środowiska.
function readRuntimeMediaUrl(): string | null {
  const raw = (globalThis as { __APP_CONFIG__?: AppRuntimeConfig }).__APP_CONFIG__?.mediaUrl;
  if (!raw || raw.includes('MEDIA_URL')) {
    return null;
  }
  return raw;
}

export function getMediaUrl(): string {
  return readRuntimeMediaUrl() ?? environment.mediaUrl ?? '';
}
