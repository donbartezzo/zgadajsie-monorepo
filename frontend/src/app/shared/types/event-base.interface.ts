import {
  EventDefaultableFields,
  EventStatus,
  DictionaryItem,
  City,
  TargetOccupancyConfig,
} from '@zgadajsie/shared';
import { UserBrief } from './common.interface';

/**
 * Cała informacja o okładce wydarzenia w jednym obiekcie: `id` (tożsamość/edycja),
 * `storageKey` (URL) i `updatedAt` (cache-busting). Brak okładki = `coverImage` undefined.
 */
export interface EventCoverImage {
  id: string;
  storageKey?: string | null;
  updatedAt?: string | null;
}

export interface EventBase
  extends
    Required<Pick<EventDefaultableFields, 'maxParticipants' | 'gender'>>,
    Pick<EventDefaultableFields, 'minParticipants' | 'ageMin' | 'ageMax'> {
  id: string;
  title: string;
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
  targetOccupancyConfig?: TargetOccupancyConfig | null;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: City;
  organizer?: UserBrief;
  coverImage?: EventCoverImage;
  _count?: { enrollments: number; participants: number; totalEnrollments?: number };
  seriesId?: string | null;
}
