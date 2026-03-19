import { PRE_ENROLLMENT_HOURS, subtractHours } from '@zgadajsie/shared';
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

  const threshold = subtractHours(startsAt, PRE_ENROLLMENT_HOURS);

  if (now < threshold) {
    return 'PRE_ENROLLMENT';
  }

  return 'LOTTERY_PENDING';
}

export function getLotteryThreshold(startsAt: string): Date {
  return subtractHours(startsAt, PRE_ENROLLMENT_HOURS);
}
