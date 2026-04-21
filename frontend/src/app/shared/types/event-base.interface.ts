import { EventDefaultableFields, EventStatus } from '@zgadajsie/shared';
import { DictionaryItem, City } from './dictionary.interface';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';

export interface EventBase
  extends
    Required<Pick<EventDefaultableFields, 'maxParticipants' | 'gender'>>,
    Pick<EventDefaultableFields, 'minParticipants' | 'ageMin' | 'ageMax'> {
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
  status: EventStatus;
  createdAt: string;
  updatedAt: string;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: City;
  organizer?: UserBrief;
  coverImage?: CoverImage;
  _count?: { enrollments: number };
}
