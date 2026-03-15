const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function daysFromNow(days: number, now = new Date()): Date {
  return new Date(now.getTime() + days * MS_PER_DAY);
}

export function hoursFromNow(hours: number, now = new Date()): Date {
  return new Date(now.getTime() + hours * MS_PER_HOUR);
}
