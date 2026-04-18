import { EventStatus, EventTimeStatus } from '@zgadajsie/shared';
import { getEventTimeStatus, isEventJoinable } from './event-time-status.util';

const HOUR = 60 * 60 * 1000;

describe('getEventTimeStatus()', () => {
  it('zwraca UPCOMING gdy now < startsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + HOUR).toISOString();
    const endsAt = new Date(now.getTime() + 2 * HOUR).toISOString();

    expect(getEventTimeStatus(startsAt, endsAt, EventStatus.ACTIVE, now)).toBe(
      EventTimeStatus.UPCOMING,
    );
  });

  it('zwraca ONGOING gdy startsAt <= now < endsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - HOUR).toISOString();
    const endsAt = new Date(now.getTime() + HOUR).toISOString();

    expect(getEventTimeStatus(startsAt, endsAt, EventStatus.ACTIVE, now)).toBe(
      EventTimeStatus.ONGOING,
    );
  });

  it('zwraca ENDED gdy now >= endsAt', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 3 * HOUR).toISOString();
    const endsAt = new Date(now.getTime() - HOUR).toISOString();

    expect(getEventTimeStatus(startsAt, endsAt, EventStatus.ACTIVE, now)).toBe(
      EventTimeStatus.ENDED,
    );
  });

  it('zwraca ENDED gdy event.status === CANCELLED (niezależnie od dat)', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + HOUR).toISOString();
    const endsAt = new Date(now.getTime() + 2 * HOUR).toISOString();

    expect(getEventTimeStatus(startsAt, endsAt, EventStatus.CANCELLED, now)).toBe(
      EventTimeStatus.ENDED,
    );
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
