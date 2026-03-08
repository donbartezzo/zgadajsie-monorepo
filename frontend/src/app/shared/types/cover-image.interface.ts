import { DictionaryItem } from './dictionary.interface';

export interface CoverImage {
  id: string;
  disciplineId: string;
  url: string;
  originalName: string;
  createdAt: string;
  discipline?: DictionaryItem;
}
