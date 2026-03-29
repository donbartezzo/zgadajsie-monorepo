import { EventStatus, EventTimeStatus, nowInZone } from '@zgadajsie/shared';

export function getEventTimeStatus(
  startsAt: string,
  endsAt: string,
  status: string,
  now = nowInZone().toJSDate(),
): EventTimeStatus {
  if (status === EventStatus.CANCELLED) return EventTimeStatus.ENDED;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now >= end) return EventTimeStatus.ENDED;
  if (now >= start) return EventTimeStatus.ONGOING;
  return EventTimeStatus.UPCOMING;
}

export function isEventJoinable(
  startsAt: string,
  status: string,
  now = nowInZone().toJSDate(),
): boolean {
  return status === EventStatus.ACTIVE && now < new Date(startsAt);
}
