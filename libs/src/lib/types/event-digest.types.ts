import { EventStatus } from '../enums/event-status.enum';

export interface EventDigestItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  enrollmentCount: number;
  seriesId: string | null;
  seriesName: string | null;
  confirmToken: string | null;
  address: string;
  costPerPerson: number;
  maxParticipants: number;
  coverImage?: { storageKey?: string | null } | null;
}

export interface SeriesDigestItem {
  id: string;
  name: string;
  recurrenceType: string;
  isActive: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  pendingCount: number;
  nextEventAt: string | null;
}

export interface OrganizerDigestData {
  period: { from: string; to: string };
  pendingConfirmations: EventDigestItem[];
  recentlyCreated: EventDigestItem[];
  recentlyEnded: EventDigestItem[];
  upcoming: EventDigestItem[];
  recentlyCancelled: EventDigestItem[];
  activeSeries: SeriesDigestItem[];
  recentlyDeactivatedSeries: SeriesDigestItem[];
}
