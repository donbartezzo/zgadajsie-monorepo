import { EventStatus, PRE_ENROLLMENT_HOURS, nowInZone, subtractHours } from '@zgadajsie/shared';
import { EventLifecycleStatus } from '../../features/event/constants/event-status-messages';

export function getEventLifecycleStatus(
  startsAt: string,
  endsAt: string,
  status: string,
  now = nowInZone().toJSDate(),
): EventLifecycleStatus {
  if (status === EventStatus.CANCELLED) return 'CANCELLED';
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now >= end) return 'ENDED';
  if (now >= start) return 'ONGOING';
  return 'UPCOMING';
}

export function isEventJoinable(
  startsAt: string,
  status: string,
  now = nowInZone().toJSDate(),
): boolean {
  return status === EventStatus.ACTIVE && now < new Date(startsAt);
}

export function isPreEnrollment(
  startsAt: string,
  lotteryExecutedAt: string | null | undefined,
  status: string,
  now = nowInZone().toJSDate(),
): boolean {
  if (status !== EventStatus.ACTIVE) return false;
  if (lotteryExecutedAt) return false;
  return now < getLotteryThreshold(startsAt);
}

export function getLotteryThreshold(startsAt: string): Date {
  return subtractHours(startsAt, PRE_ENROLLMENT_HOURS);
}
