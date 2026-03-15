export type EventTimeStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

interface EventTimeable {
  startsAt: Date;
  endsAt: Date;
  status: string;
}

export function getEventTimeStatus(event: EventTimeable, now = new Date()): EventTimeStatus {
  if (event.status === 'CANCELLED') return 'ENDED';
  if (now < event.startsAt) return 'UPCOMING';
  if (now >= event.startsAt && now < event.endsAt) return 'ONGOING';
  return 'ENDED';
}

export function isEventJoinable(event: EventTimeable, now = new Date()): boolean {
  return event.status === 'ACTIVE' && now < event.startsAt;
}
