import { daysFromNow } from './date.util';

export function buildEventListingWhere(now: Date = new Date()) {
  const dateFrom = daysFromNow(-7, now);
  const dateTo = daysFromNow(7, now);
  return {
    status: { in: ['ACTIVE', 'CANCELLED'] as const },
    visibility: 'PUBLIC' as const,
    OR: [
      { startsAt: { gte: dateFrom, lte: dateTo } },
      { startsAt: { lt: now }, endsAt: { gt: now } },
    ],
  };
}
