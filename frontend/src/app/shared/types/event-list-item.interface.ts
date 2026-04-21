import { EventStatus } from '@zgadajsie/shared';
import { DictionaryItem, City } from './dictionary.interface';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';

export interface EventListItem {
  id: string;
  title: string;
  coverImageId?: string;
  startsAt: string;
  endsAt: string;
  costPerPerson: number;
  address: string;
  lat: number;
  lng: number;
  rules?: string;
  gender: string;
  status: EventStatus;
  maxParticipants?: number;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: City;
  organizer?: UserBrief;
  coverImage?: CoverImage;
  _count?: { enrollments: number };
}
