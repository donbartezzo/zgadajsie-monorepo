import { DictionaryItem } from './dictionary.interface';

export const COVER_EVENTS_PATH = 'assets/covers/events';

export function coverImageUrl(disciplineSlug: string, filename: string): string {
  return `${COVER_EVENTS_PATH}/${disciplineSlug}/${filename}`;
}

export interface CoverImage {
  id: string;
  disciplineSlug: string;
  filename: string;
  createdAt: string;
  discipline?: DictionaryItem;
}
