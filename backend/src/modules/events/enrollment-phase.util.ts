import { PRE_ENROLLMENT_HOURS } from '@zgadajsie/shared';

export type EnrollmentPhase = 'PRE_ENROLLMENT' | 'LOTTERY_PENDING' | 'OPEN_ENROLLMENT';

interface EnrollmentPhaseable {
  startsAt: Date;
  lotteryExecutedAt: Date | null;
  status: string;
}

export function getEnrollmentPhase(
  event: EnrollmentPhaseable,
  now = new Date(),
): EnrollmentPhase | null {
  if (event.status !== 'ACTIVE' || now >= event.startsAt) {
    return null;
  }

  if (event.lotteryExecutedAt !== null) {
    return 'OPEN_ENROLLMENT';
  }

  const lotteryThreshold = new Date(
    event.startsAt.getTime() - PRE_ENROLLMENT_HOURS * 60 * 60 * 1000,
  );

  if (now < lotteryThreshold) {
    return 'PRE_ENROLLMENT';
  }

  return 'LOTTERY_PENDING';
}

export function isPreEnrollment(event: EnrollmentPhaseable, now = new Date()): boolean {
  return getEnrollmentPhase(event, now) === 'PRE_ENROLLMENT';
}

export function isOpenEnrollment(event: EnrollmentPhaseable, now = new Date()): boolean {
  return getEnrollmentPhase(event, now) === 'OPEN_ENROLLMENT';
}

export function isLotteryPending(event: EnrollmentPhaseable, now = new Date()): boolean {
  return getEnrollmentPhase(event, now) === 'LOTTERY_PENDING';
}

export function getLotteryThreshold(startsAt: Date): Date {
  return new Date(startsAt.getTime() - PRE_ENROLLMENT_HOURS * 60 * 60 * 1000);
}

export function shouldSkipPreEnrollment(startsAt: Date, now = new Date()): boolean {
  return getLotteryThreshold(startsAt) <= now;
}
