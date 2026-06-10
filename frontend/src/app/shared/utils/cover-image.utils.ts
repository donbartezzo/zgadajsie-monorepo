import { environment } from '../../../environments/environment';

/**
 * Lokalny, bundlowany cover wyświetlany jako fallback, gdy właściwy obraz
 * nie da się załadować (np. stary cover bez storageKey, którego pliku już nie ma).
 * Plik jest częścią builda (`frontend/public/assets`), więc nigdy nie zwróci 404.
 */
export const DEFAULT_COVER_IMAGE_URL = 'assets/default-cover.webp';

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

export function buildCoverImageUrl(cover: CoverImage): string {
  if (cover.storageKey) {
    const baseUrl = environment.mediaUrl || '';
    const cacheBuster = cover.updatedAt ? `?v=${new Date(cover.updatedAt).getTime()}` : '';
    return `${baseUrl}/${cover.storageKey}${cacheBuster}`;
  }

  // Brak storageKey = cover domyślny lub niezmigrowany legacy.
  // Zwracamy lokalny, bundlowany default - jedyne źródło prawdy dla domyślnej okładki
  // (zamiast martwych ścieżek /assets/covers/events/... generujących 404).
  return DEFAULT_COVER_IMAGE_URL;
}
