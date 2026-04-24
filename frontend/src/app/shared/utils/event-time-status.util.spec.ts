import { EventStatus } from '@zgadajsie/shared';
import {
  getEventLifecycleStatus,
  getLotteryThreshold,
  isEventJoinable,
  isPreEnrollment,
} from './event-time-status.util';

const HOUR = 60 * 60 * 1000;

describe('getEventLifecycleStatus()', () => {
  it('zwraca UPCOMING gdy now < startsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + HOUR).toISOString();
    const endsAt = new Date(now.getTime() + 2 * HOUR).toISOString();

    expect(getEventLifecycleStatus(startsAt, endsAt, EventStatus.ACTIVE, now)).toBe('UPCOMING');
  });

  it('zwraca ONGOING gdy startsAt <= now < endsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - HOUR).toISOString();
    const endsAt = new Date(now.getTime() + HOUR).toISOString();

    expect(getEventLifecycleStatus(startsAt, endsAt, EventStatus.ACTIVE, now)).toBe('ONGOING');
  });

  it('zwraca ENDED gdy now >= endsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 3 * HOUR).toISOString();
    const endsAt = new Date(now.getTime() - HOUR).toISOString();

    expect(getEventLifecycleStatus(startsAt, endsAt, EventStatus.ACTIVE, now)).toBe('ENDED');
  });

  it('zwraca CANCELLED gdy event.status === CANCELLED (niezależnie od dat)', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + HOUR).toISOString();
    const endsAt = new Date(now.getTime() + 2 * HOUR).toISOString();

    expect(getEventLifecycleStatus(startsAt, endsAt, EventStatus.CANCELLED, now)).toBe('CANCELLED');
  });
});

describe('isEventJoinable()', () => {
  it('zwraca true gdy event.status === ACTIVE i now < startsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + HOUR).toISOString();

    expect(isEventJoinable(startsAt, EventStatus.ACTIVE, now)).toBe(true);
  });

  it('zwraca false gdy event CANCELLED', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + HOUR).toISOString();

    expect(isEventJoinable(startsAt, EventStatus.CANCELLED, now)).toBe(false);
  });

  it('zwraca false gdy event już się rozpoczął (now >= startsAt)', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - HOUR).toISOString();

    expect(isEventJoinable(startsAt, EventStatus.ACTIVE, now)).toBe(false);
  });

  it('zwraca false gdy event ACTIVE ale już po startsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 30 * 1000).toISOString();

    expect(isEventJoinable(startsAt, EventStatus.ACTIVE, now)).toBe(false);
  });
});

describe('isPreEnrollment()', () => {
  it('zwraca true gdy now < lotteryThreshold i lotteryExecutedAt=null', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 72 * HOUR).toISOString();

    expect(isPreEnrollment(startsAt, null, EventStatus.ACTIVE, now)).toBe(true);
  });

  it('zwraca false gdy lotteryExecutedAt !== null', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 72 * HOUR).toISOString();

    expect(isPreEnrollment(startsAt, now.toISOString(), EventStatus.ACTIVE, now)).toBe(false);
  });

  it('zwraca false gdy event CANCELLED', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 72 * HOUR).toISOString();

    expect(isPreEnrollment(startsAt, null, EventStatus.CANCELLED, now)).toBe(false);
  });

  it('zwraca false gdy now >= lotteryThreshold', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * HOUR).toISOString();

    expect(isPreEnrollment(startsAt, null, EventStatus.ACTIVE, now)).toBe(false);
  });
});

describe('getLotteryThreshold()', () => {
  it('zwraca startsAt - PRE_ENROLLMENT_HOURS', () => {
    const startsAt = '2026-05-01T12:00:00Z';
    const threshold = getLotteryThreshold(startsAt);
    const expected = new Date('2026-04-29T12:00:00Z');
    expect(threshold.getTime()).toBe(expected.getTime());
  });
});
