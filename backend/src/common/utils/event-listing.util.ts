import { daysFromNow } from './date.util';
import { EventStatus } from '@prisma/client';

export function buildEventListingWhere(now: Date = new Date()) {
  const dateFrom = daysFromNow(-7, now);
  const dateTo = daysFromNow(7, now);
  return {
    status: { in: ['ACTIVE', 'CANCELLED'] as EventStatus[] },
    visibility: 'PUBLIC' as const,
    OR: [
      { startsAt: { gte: dateFrom, lte: dateTo } },
      { startsAt: { lt: now }, endsAt: { gt: now } },
    ],
  };
}
