import { EventSeriesRecurrenceType } from '../enums/event-series-recurrence-type.enum';

/**
 * daysOfWeek używa konwencji ISO/Luxon:
 * 1 = poniedziałek, 2 = wtorek, ..., 7 = niedziela
 */
export type RecurrenceConfig =
  | { type: EventSeriesRecurrenceType.INTERVAL; intervalDays: number }
  | { type: EventSeriesRecurrenceType.WEEKLY; daysOfWeek: number[] };

export interface TargetOccupancyConfig {
  targetOccupancy: number;
  cleanupHours: number;
  minFreeSlotsBuffer: number;
}

export interface EventSeriesBase {
  id: string;
  organizerId: string;
  name: string;
  recurrenceType: EventSeriesRecurrenceType;
  intervalDays?: number;
  daysOfWeek?: number[];
  time: string;
  timezone: string;
  durationMinutes: number;
  startDate: string;
  endDate?: string | null;
  bufferDays: number;
  autoCoverImage: boolean;
  isActive: boolean;
  sourceEventId?: string | null;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  targetOccupancyConfig?: TargetOccupancyConfig | null;
  templateSnapshot?: Record<string, unknown>;
}

export interface CreateEventSeriesPayload {
  name: string;
  recurrenceType: EventSeriesRecurrenceType;
  intervalDays?: number;
  daysOfWeek?: number[];
  time: string;
  timezone?: string;
  durationMinutes: number;
  startDate: string;
  endDate?: string;
  bufferDays?: number;
  autoCoverImage?: boolean;
  title: string;
  description?: string;
  disciplineSlug: string;
  facilitySlug: string;
  levelSlug: string;
  citySlug: string;
  address: string;
  lat: number;
  lng: number;
  costPerPerson?: number;
  minParticipants?: number;
  maxParticipants: number;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  visibility?: string;
  coverImageId?: string;
  rules?: string;
  facilityReserved?: boolean;
  roleConfig?: unknown;
  targetOccupancy?: number | null;
  cleanupHours?: number;
  minFreeSlotsBuffer?: number;
}

export interface CreateSeriesFromEventPayload {
  name: string;
  recurrenceType: EventSeriesRecurrenceType;
  intervalDays?: number;
  daysOfWeek?: number[];
  time?: string;
  timezone?: string;
  durationMinutes?: number;
  startDate?: string;
  endDate?: string;
  bufferDays?: number;
  autoCoverImage?: boolean;
  targetOccupancy?: number | null;
  cleanupHours?: number;
  minFreeSlotsBuffer?: number;
}

export type UpdateEventSeriesPayload = Partial<CreateEventSeriesPayload> & {
  isActive?: boolean;
};

export interface EventSeriesPreviewItem {
  start: string;
  end: string;
}
