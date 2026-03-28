import { EventStatus, EventTimeStatus } from '@zgadajsie/shared';

export function getEventTimeStatus(
  startsAt: string,
  endsAt: string,
  status: string,
  now = new Date(),
): EventTimeStatus {
  if (status === EventStatus.CANCELLED) return EventTimeStatus.ENDED;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now < start) return EventTimeStatus.UPCOMING;
  if (now >= start && now < end) return EventTimeStatus.ONGOING;
  return EventTimeStatus.ENDED;
}

export function isEventJoinable(startsAt: string, status: string, now = new Date()): boolean {
  return status === EventStatus.ACTIVE && now < new Date(startsAt);
}
