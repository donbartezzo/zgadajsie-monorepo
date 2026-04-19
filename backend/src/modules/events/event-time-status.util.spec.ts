import { getEventTimeStatus, isEventJoinable } from './event-time-status.util';

const HOUR = 60 * 60 * 1000;

function makeEvent(overrides: { startsAt?: Date; endsAt?: Date; status?: string }) {
  return {
    startsAt: overrides.startsAt ?? new Date(Date.now() + HOUR),
    endsAt: overrides.endsAt ?? new Date(Date.now() + 3 * HOUR),
    status: overrides.status ?? 'ACTIVE',
  };
}

describe('getEventTimeStatus()', () => {
  it('zwraca UPCOMING gdy now < startsAt', () => {
    const event = makeEvent({});
    expect(getEventTimeStatus(event)).toBe('UPCOMING');
  });

  it('zwraca ONGOING gdy startsAt <= now < endsAt', () => {
    const now = new Date();
    const event = makeEvent({
      startsAt: new Date(now.getTime() - HOUR),
      endsAt: new Date(now.getTime() + HOUR),
    });
    expect(getEventTimeStatus(event, now)).toBe('ONGOING');
  });

  it('zwraca ENDED gdy now >= endsAt', () => {
    const now = new Date();
    const event = makeEvent({
      startsAt: new Date(now.getTime() - 3 * HOUR),
      endsAt: new Date(now.getTime() - HOUR),
    });
    expect(getEventTimeStatus(event, now)).toBe('ENDED');
  });

  it('zwraca ENDED gdy event.status === CANCELLED (niezależnie od dat)', () => {
    const event = makeEvent({ status: 'CANCELLED' });
    expect(getEventTimeStatus(event)).toBe('ENDED');
  });
});

describe('isEventJoinable()', () => {
  it('zwraca true gdy event.status === ACTIVE i now < startsAt', () => {
    const event = makeEvent({ status: 'ACTIVE' });
    expect(isEventJoinable(event)).toBe(true);
  });

  it('zwraca false gdy event CANCELLED', () => {
    const event = makeEvent({ status: 'CANCELLED' });
    expect(isEventJoinable(event)).toBe(false);
  });

  it('zwraca false gdy event już się rozpoczął (now >= startsAt)', () => {
    const now = new Date();
    const event = makeEvent({
      startsAt: new Date(now.getTime() - HOUR),
      status: 'ACTIVE',
    });
    expect(isEventJoinable(event, now)).toBe(false);
  });

  it('zwraca false gdy event ACTIVE ale już po startsAt', () => {
    const now = new Date();
    const event = makeEvent({
      startsAt: new Date(now.getTime() - 30 * 1000),
      status: 'ACTIVE',
    });
    expect(isEventJoinable(event, now)).toBe(false);
  });
});
