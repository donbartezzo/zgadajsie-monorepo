import { PRE_ENROLLMENT_HOURS } from '@zgadajsie/shared';
import { EnrollmentPhase } from '../types/event.interface';

export function getEnrollmentPhase(
  startsAt: string,
  lotteryExecutedAt: string | null | undefined,
  status: string,
  now = new Date(),
): EnrollmentPhase | null {
  if (status !== 'ACTIVE' || now >= new Date(startsAt)) {
    return null;
  }

  if (lotteryExecutedAt !== null && lotteryExecutedAt !== undefined) {
    return 'OPEN_ENROLLMENT';
  }

  const threshold = new Date(
    new Date(startsAt).getTime() - PRE_ENROLLMENT_HOURS * 60 * 60 * 1000,
  );

  if (now < threshold) {
    return 'PRE_ENROLLMENT';
  }

  return 'LOTTERY_PENDING';
}

export function getLotteryThreshold(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - PRE_ENROLLMENT_HOURS * 60 * 60 * 1000);
}
