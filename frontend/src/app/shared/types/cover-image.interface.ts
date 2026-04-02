import { DictionaryItem } from './dictionary.interface';

export const COVER_EVENTS_PATH = 'assets/covers/events';

export function coverImageUrl(disciplineSlug: string, filename: string): string {
  return `${COVER_EVENTS_PATH}/${disciplineSlug}/${filename}`;
}

export function getEventCoverUrl(event: {
  coverImage?: { filename?: string; disciplineSlug?: string } | null;
  discipline?: { slug?: string } | null;
}): string | null {
  const filename = event.coverImage?.filename;
  if (!filename) return null;
  const disciplineSlug = event.coverImage?.disciplineSlug || event.discipline?.slug || '';
  return coverImageUrl(disciplineSlug, filename);
}

export interface CoverImage {
  id: string;
  disciplineSlug: string;
  filename: string;
  createdAt: string;
  discipline?: DictionaryItem;
}
