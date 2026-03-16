import { EventStatus } from '@zgadajsie/shared';
import { DictionaryItem } from './dictionary.interface';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';

export type EnrollmentPhase = 'PRE_ENROLLMENT' | 'LOTTERY_PENDING' | 'OPEN_ENROLLMENT';

export interface CurrentUserAccess {
  isParticipant: boolean;
  isOrganizer: boolean;
  participationStatus: string | null;
  participationId: string | null;
  isBannedByOrganizer?: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  coverImageId?: string;
  disciplineId: string;
  facilityId: string;
  levelId: string;
  cityId: string;
  organizerId: string;
  startsAt: string;
  endsAt: string;
  costPerPerson: number;
  minParticipants?: number;
  maxParticipants: number;
  ageMin?: number;
  ageMax?: number;
  gender: string;
  visibility: string;
  lotteryExecutedAt?: string | null;
  status: EventStatus;
  address: string;
  lat: number;
  lng: number;
  rules?: string;
  isRecurring: boolean;
  recurringRule?: string;
  parentEventId?: string;
  createdAt: string;
  updatedAt: string;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: DictionaryItem;
  organizer?: UserBrief;
  coverImage?: CoverImage;
  _count?: { participations: number };
  currentUserAccess?: CurrentUserAccess;
  eventTimeStatus?: 'UPCOMING' | 'ONGOING' | 'ENDED';
  enrollmentPhase?: EnrollmentPhase | null;
}
