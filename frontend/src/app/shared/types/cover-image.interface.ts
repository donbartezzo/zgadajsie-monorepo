export const COVER_EVENTS_PATH = 'assets/covers/events';

export function coverImageUrl(disciplineSlug: string | null | undefined, filename: string): string {
  return `${COVER_EVENTS_PATH}/${disciplineSlug || ''}/${filename}`;
}

export function getEventCoverUrl(event: {
  coverImage?: { filename?: string; disciplineSlug?: string | null } | null;
  discipline?: { slug?: string } | null;
}): string | null {
  const filename = event.coverImage?.filename;
  if (!filename) return null;
  const disciplineSlug = event.coverImage?.disciplineSlug || event.discipline?.slug || '';
  return coverImageUrl(disciplineSlug, filename);
}

export interface CoverImage {
  id: string;
  disciplineSlug?: string | null;
  filename: string;
  storageKey?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  ownerUserId?: string | null;
  name?: string | null;
  isDefault?: boolean;
  discipline?: { slug: string };
}
