import {
  EventDefaultableFields,
  EventStatus,
  EventTimeStatus,
  DisciplineRole,
} from '@zgadajsie/shared';
import { DictionaryItem, City } from './dictionary.interface';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';

export type EnrollmentPhase = 'PRE_ENROLLMENT' | 'LOTTERY_PENDING' | 'OPEN_ENROLLMENT';

export interface CurrentUserAccess {
  isNewUser: boolean;
}

export interface EventRoleConfig {
  disciplineSlug: string;
  roles: DisciplineRole[];
}

/**
 * Event interface rozszerza pola z EventDefaultableFields dla spójności typów.
 * - maxParticipants, gender: wymagane
 * - minParticipants, ageMin, ageMax: opcjonalne
 */
export interface Event
  extends
    Required<Pick<EventDefaultableFields, 'maxParticipants' | 'gender'>>,
    Pick<EventDefaultableFields, 'minParticipants' | 'ageMin' | 'ageMax'> {
  id: string;
  title: string;
  description?: string;
  coverImageId?: string;
  disciplineSlug: string;
  facilitySlug: string;
  levelSlug: string;
  citySlug: string;
  organizerId: string;
  startsAt: string;
  endsAt: string;
  costPerPerson: number;
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

  currentUserAccess?: CurrentUserAccess | null;

  roleConfig?: EventRoleConfig | null;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: City;
  organizer?: UserBrief;
  coverImage?: CoverImage;
  _count?: { enrollments: number };
  eventTimeStatus?: EventTimeStatus;
  enrollmentPhase?: EnrollmentPhase | null;
}
