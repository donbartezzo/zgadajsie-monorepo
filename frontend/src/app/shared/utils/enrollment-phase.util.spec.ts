import { getEnrollmentPhase, getLotteryThreshold } from './enrollment-phase.util';

const PRE_ENROLLMENT_HOURS = 48;
const HOUR = 60 * 60 * 1000;

describe('getEnrollmentPhase()', () => {
  it('zwraca null gdy status !== ACTIVE', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 72 * HOUR).toISOString();

    expect(getEnrollmentPhase(startsAt, null, 'CANCELLED', now)).toBeNull();
  });

  it('zwraca null gdy now >= startsAt (event się rozpoczął)', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - HOUR).toISOString();

    expect(getEnrollmentPhase(startsAt, null, 'ACTIVE', now)).toBeNull();
  });

  it('zwraca PRE_ENROLLMENT gdy now < (startsAt - 48h) i lotteryExecutedAt=null', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 72 * HOUR).toISOString(); // 72h ahead

    expect(getEnrollmentPhase(startsAt, null, 'ACTIVE', now)).toBe('PRE_ENROLLMENT');
  });

  it('zwraca LOTTERY_PENDING gdy now >= threshold i lotteryExecutedAt=null', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * HOUR).toISOString(); // 24h ahead

    expect(getEnrollmentPhase(startsAt, null, 'ACTIVE', now)).toBe('LOTTERY_PENDING');
  });

  it('zwraca OPEN_ENROLLMENT gdy lotteryExecutedAt !== null', () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * HOUR).toISOString();
    const lotteryExecutedAt = new Date().toISOString();

    expect(getEnrollmentPhase(startsAt, lotteryExecutedAt, 'ACTIVE', now)).toBe(
      'OPEN_ENROLLMENT',
    );
  });

  it('edge case: dokładnie na granicy threshold (48h przed startem)', () => {
    const startsAt = new Date(Date.now() + PRE_ENROLLMENT_HOURS * HOUR);
    const now = new Date(); // now === threshold

    expect(getEnrollmentPhase(startsAt.toISOString(), null, 'ACTIVE', now)).toBe(
      'LOTTERY_PENDING',
    );
  });
});

describe('getLotteryThreshold()', () => {
  it('zwraca startsAt - PRE_ENROLLMENT_HOURS', () => {
    const startsAt = '2026-05-01T12:00:00.000Z';
    const threshold = getLotteryThreshold(startsAt);
    const expected = new Date('2026-04-29T12:00:00.000Z');

    expect(threshold.getTime()).toBe(expected.getTime());
  });
});
