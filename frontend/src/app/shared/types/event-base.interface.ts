import { EventDefaultableFields, EventStatus, DictionaryItem, City } from '@zgadajsie/shared';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';

export interface EventBase
  extends
    Required<Pick<EventDefaultableFields, 'maxParticipants' | 'gender'>>,
    Pick<EventDefaultableFields, 'minParticipants' | 'ageMin' | 'ageMax' | 'targetOccupancy'> {
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
  facilityReserved?: boolean;
  welcomeMessageEnabled?: boolean;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  lotteryExecutedAt?: string | null;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: City;
  organizer?: UserBrief;
  coverImage?: CoverImage;
  _count?: { enrollments: number; participants: number; totalEnrollments?: number };
  seriesId?: string | null;
}
