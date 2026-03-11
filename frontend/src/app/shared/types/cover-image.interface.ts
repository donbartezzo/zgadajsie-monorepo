import { DictionaryItem } from './dictionary.interface';

export const COVER_EVENTS_PATH = 'assets/covers/events';

export function coverImageUrl(filename: string): string {
  return `${COVER_EVENTS_PATH}/${filename}`;
}

export interface CoverImage {
  id: string;
  disciplineId: string;
  filename: string;
  originalName: string;
  createdAt: string;
  discipline?: DictionaryItem;
}
