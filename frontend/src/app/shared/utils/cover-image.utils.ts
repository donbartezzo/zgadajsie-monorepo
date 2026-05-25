import { environment } from '../../../environments/environment';

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

  // Fallback dla starych cover images bez storageKey (przed migracją do R2)
  if (cover.disciplineSlug) {
    return `/assets/covers/events/${cover.disciplineSlug}/${cover.filename}`;
  }

  return `/assets/covers/events/${cover.filename}`;
}
