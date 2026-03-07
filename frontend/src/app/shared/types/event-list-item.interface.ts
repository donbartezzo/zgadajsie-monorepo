import { DictionaryItem } from './dictionary.interface';
import { UserBrief } from './common.interface';

export interface EventListItem {
  id: string;
  title: string;
  coverImageUrl?: string;
  startsAt: string;
  endsAt: string;
  costPerPerson: number;
  address: string;
  lat: number;
  lng: number;
  rules?: string;
  gender: string;
  status: string;
  maxParticipants?: number;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: DictionaryItem;
  organizer?: UserBrief;
  _count?: { participations: number };
}
