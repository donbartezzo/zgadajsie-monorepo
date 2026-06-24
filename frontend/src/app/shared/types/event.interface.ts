import { DisciplineRole } from '@zgadajsie/shared';
import { EventBase } from './event-base.interface';

export interface CurrentUserAccess {
  isTrusted: boolean;
  isOrganizer?: boolean;
  canCreateSeries?: boolean;
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
export interface Event extends EventBase {
  currentUserAccess?: CurrentUserAccess | null;
  description?: string;
  disciplineSlug: string;
  facilitySlug: string;
  levelSlug: string;
  citySlug: string;
  organizerId: string;
  visibility: string;
  roleConfig?: EventRoleConfig | null;
  seriesId?: string;
  series?: { id: string; name: string } | null;
}
