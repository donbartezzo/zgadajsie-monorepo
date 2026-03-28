import { EventDefaultableFields, EventStatus } from '@zgadajsie/shared';
import { DictionaryItem, City } from './dictionary.interface';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';
import { EventTimeStatus } from '../utils/event-time-status.util';

export type EnrollmentPhase = 'PRE_ENROLLMENT' | 'LOTTERY_PENDING' | 'OPEN_ENROLLMENT';

export interface CurrentUserAccess {
  isParticipant: boolean;
  isOrganizer: boolean;
  participationStatus: string | null;
  participationId: string | null;
  isBannedByOrganizer?: boolean;
}

/**
 * Konfiguracja roli w wydarzeniu (snapshot z schematu dyscypliny).
 */
export interface EventRole {
  key: string;
  title: string;
  desc: string;
  slots: number;
  isDefault: boolean;
}

/**
 * Konfiguracja ról dla wydarzenia (przechowywana jako JSON w Event.roleConfig).
 */
export interface EventRoleConfig {
  disciplineSlug: string;
  roles: EventRole[];
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

  roleConfig?: EventRoleConfig | null;

  discipline?: DictionaryItem;
  facility?: DictionaryItem;
  level?: DictionaryItem;
  city?: City;
  organizer?: UserBrief;
  coverImage?: CoverImage;
  _count?: { participations: number };
  currentUserAccess?: CurrentUserAccess;
  eventTimeStatus?: EventTimeStatus;
  enrollmentPhase?: EnrollmentPhase | null;
}
