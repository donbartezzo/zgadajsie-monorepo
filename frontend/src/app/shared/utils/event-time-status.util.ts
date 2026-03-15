import { EventStatus } from '@zgadajsie/shared';

export type EventTimeStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

export function getEventTimeStatus(
  startsAt: string,
  endsAt: string,
  status: string,
  now = new Date(),
): EventTimeStatus {
  if (status === EventStatus.CANCELLED) return 'ENDED';
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now < start) return 'UPCOMING';
  if (now >= start && now < end) return 'ONGOING';
  return 'ENDED';
}

export function isEventJoinable(startsAt: string, status: string, now = new Date()): boolean {
  return status === EventStatus.ACTIVE && now < new Date(startsAt);
}
