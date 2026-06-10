import { environment } from '../../../environments/environment';

/**
 * Lokalny, bundlowany cover wyświetlany jako fallback, gdy właściwy obraz
 * nie da się załadować (np. stary cover bez storageKey, którego pliku już nie ma).
 * Plik jest częścią builda (`frontend/public/assets`), więc nigdy nie zwróci 404.
 */
export const DEFAULT_COVER_IMAGE_URL = 'assets/default-cover.webp';

/**
 * Prefiks storageKey prywatnych coverów userów - żyją w buckecie per-env (mediaUrl).
 * Pozostałe covery (publiczna galeria dyscyplin zarządzana przez admina) żyją we
 * wspólnym buckecie publicznym (publicMediaUrl), wspólnym dla wszystkich środowisk.
 */
export const USER_STORAGE_PREFIX = 'cover-images/user/';

export interface CoverImage {
  id: string;
  storageKey?: string | null;
  disciplineSlug?: string | null;
  filename: string;
  createdAt: string;
  updatedAt?: string | null;
  ownerUserId?: string | null;
  name?: string | null;
  isDefault?: boolean;
}

// Przyjmuje dowolny obiekt z storageKey/updatedAt - pełny CoverImage (galeria) lub
// minimalną projekcję EventCoverImage z obiektu Event.
export function buildCoverImageUrl(cover: {
  storageKey?: string | null;
  updatedAt?: string | null;
}): string {
  if (cover.storageKey) {
    const isPublic = !cover.storageKey.startsWith(USER_STORAGE_PREFIX);
    const baseUrl = (isPublic ? environment.publicMediaUrl : environment.mediaUrl) || '';
    const cacheBuster = cover.updatedAt ? `?v=${new Date(cover.updatedAt).getTime()}` : '';
    return `${baseUrl}/${cover.storageKey}${cacheBuster}`;
  }

  // Brak storageKey = cover domyślny lub niezmigrowany legacy.
  // Zwracamy lokalny, bundlowany default - jedyne źródło prawdy dla domyślnej okładki
  // (zamiast martwych ścieżek /assets/covers/events/... generujących 404).
  return DEFAULT_COVER_IMAGE_URL;
}
