import {
  getEnrollmentPhase,
  getLotteryThreshold,
  isLotteryPending,
  isOpenEnrollment,
  isPreEnrollment,
  shouldSkipPreEnrollment,
} from './enrollment-phase.util';

const PRE_ENROLLMENT_HOURS = 48;
const HOURS = 60 * 60 * 1000;

function makeEvent(overrides: {
  startsAt?: Date;
  lotteryExecutedAt?: Date | null;
  status?: string;
}) {
  const startsAt = overrides.startsAt ?? new Date(Date.now() + 72 * HOURS);
  return {
    startsAt,
    lotteryExecutedAt: overrides.lotteryExecutedAt ?? null,
    status: overrides.status ?? 'ACTIVE',
  };
}

describe('getEnrollmentPhase()', () => {
  it('zwraca null gdy event.status !== ACTIVE', () => {
    const event = makeEvent({ status: 'CANCELLED' });
    expect(getEnrollmentPhase(event)).toBeNull();
  });

  it('zwraca null gdy now >= event.startsAt (event się rozpoczął)', () => {
    const past = new Date(Date.now() - HOURS);
    const event = makeEvent({ startsAt: past });
    expect(getEnrollmentPhase(event)).toBeNull();
  });

  it('zwraca PRE_ENROLLMENT gdy now < (startsAt - 48h) i lotteryExecutedAt=null', () => {
    const startsAt = new Date(Date.now() + 72 * HOURS); // 72h od teraz
    const now = new Date(); // 72h przed startem → poniżej progu 48h
    const event = makeEvent({ startsAt, lotteryExecutedAt: null });
    expect(getEnrollmentPhase(event, now)).toBe('PRE_ENROLLMENT');
  });

  it('zwraca LOTTERY_PENDING gdy now >= threshold i lotteryExecutedAt=null', () => {
    const startsAt = new Date(Date.now() + 24 * HOURS); // 24h od teraz
    const now = new Date(); // 24h przed startem → powyżej progu 48h
    const event = makeEvent({ startsAt, lotteryExecutedAt: null });
    expect(getEnrollmentPhase(event, now)).toBe('LOTTERY_PENDING');
  });

  it('zwraca OPEN_ENROLLMENT gdy lotteryExecutedAt !== null', () => {
    const startsAt = new Date(Date.now() + 24 * HOURS);
    const event = makeEvent({ startsAt, lotteryExecutedAt: new Date() });
    expect(getEnrollmentPhase(event)).toBe('OPEN_ENROLLMENT');
  });

  it('edge case: dokładnie na granicy threshold (48h przed startem)', () => {
    const startsAt = new Date(Date.now() + PRE_ENROLLMENT_HOURS * HOURS);
    const now = new Date(); // exactly at threshold
    const event = makeEvent({ startsAt, lotteryExecutedAt: null });
    expect(getEnrollmentPhase(event, now)).toBe('LOTTERY_PENDING');
  });
});

describe('isPreEnrollment() / isOpenEnrollment() / isLotteryPending()', () => {
  it('isPreEnrollment() zwraca true dla PRE_ENROLLMENT', () => {
    const event = makeEvent({ startsAt: new Date(Date.now() + 72 * HOURS) });
    expect(isPreEnrollment(event)).toBe(true);
  });

  it('isOpenEnrollment() zwraca true dla OPEN_ENROLLMENT', () => {
    const event = makeEvent({
      startsAt: new Date(Date.now() + 24 * HOURS),
      lotteryExecutedAt: new Date(),
    });
    expect(isOpenEnrollment(event)).toBe(true);
  });

  it('isLotteryPending() zwraca true dla LOTTERY_PENDING', () => {
    const event = makeEvent({
      startsAt: new Date(Date.now() + 24 * HOURS),
      lotteryExecutedAt: null,
    });
    expect(isLotteryPending(event)).toBe(true);
  });
});

describe('getLotteryThreshold()', () => {
  it('zwraca startsAt - PRE_ENROLLMENT_HOURS', () => {
    const startsAt = new Date('2026-05-01T12:00:00Z');
    const threshold = getLotteryThreshold(startsAt);
    const expected = new Date('2026-04-29T12:00:00Z');
    expect(threshold.getTime()).toBe(expected.getTime());
  });
});

describe('shouldSkipPreEnrollment()', () => {
  it('zwraca true gdy startsAt - 48h <= now (event za < 48h)', () => {
    const startsAt = new Date(Date.now() + 24 * HOURS); // starts in 24h
    expect(shouldSkipPreEnrollment(startsAt)).toBe(true);
  });

  it('zwraca false gdy event dalej niż 48h', () => {
    const startsAt = new Date(Date.now() + 72 * HOURS); // starts in 72h
    expect(shouldSkipPreEnrollment(startsAt)).toBe(false);
  });

  it('edge case: dokładnie na progu (threshold === now)', () => {
    const startsAt = new Date(Date.now() + PRE_ENROLLMENT_HOURS * HOURS);
    // now === threshold, so shouldSkip = true
    expect(shouldSkipPreEnrollment(startsAt)).toBe(true);
  });
});
