/**
 * Oblicza różnicę w dniach między datą wydarzenia a dzisiejszą datą.
 * Wartość dodatnia = przyszłość, ujemna = przeszłość, 0 = dziś.
 */
export function getDaysDiff(date: Date, now: Date = new Date()): number {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((eventDay.getTime() - todayStart.getTime()) / 86400000);
}

/**
 * Zwraca krótki label daty relatywnej w języku polskim.
 * Np. "Dziś", "Jutro", "Pojutrze", "Za 5 dni", "Wczoraj", "Przedwczoraj", "3 dni temu".
 */
export function getRelativeDateLabel(date: Date, now: Date = new Date()): string {
  const diff = getDaysDiff(date, now);

  if (diff === 0) return 'Dziś';
  if (diff === 1) return 'Jutro';
  if (diff === 2) return 'Pojutrze';
  if (diff === 7) return 'Za tydzień';
  if (diff > 0) return `Za ${diff} dni`;
  if (diff === -1) return 'Wczoraj';
  if (diff === -2) return 'Przedwczoraj';
  return `${Math.abs(diff)} dni temu`;
}

export interface EventCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent: boolean;
  label: string;
}

/**
 * Oblicza countdown do wydarzenia.
 *
 * Zwraca `null` jeśli:
 * - wydarzenie trwa (start <= now < end)
 * - wydarzenie się zakończyło (end <= now)
 * - do rozpoczęcia jest więcej niż `maxHours` godzin
 *
 * @param startsAt  - data rozpoczęcia wydarzenia (string ISO lub Date)
 * @param endsAt    - data zakończenia wydarzenia (string ISO lub Date)
 * @param now       - bieżąca data (domyślnie new Date())
 * @param maxHours  - maksymalna liczba godzin do wyświetlenia countdown (domyślnie 24)
 */
export function getEventCountdown(
  startsAt: string | Date,
  endsAt: string | Date,
  now: Date = new Date(),
  maxHours = 24,
): EventCountdown | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const nowMs = now.getTime();

  if (start <= nowMs && end > nowMs) return null;
  if (end <= nowMs) return null;

  const msUntil = start - nowMs;
  const hoursUntil = msUntil / 3_600_000;

  if (hoursUntil > maxHours) return null;

  const days = Math.floor(msUntil / 86_400_000);
  const hours = Math.floor((msUntil % 86_400_000) / 3_600_000);
  const minutes = Math.floor((msUntil % 3_600_000) / 60_000);
  const seconds = Math.floor((msUntil % 60_000) / 1_000);

  let label: string;
  if (days > 0) {
    label = `${days}dzień ${hours}godz.`;
  } else if (hours > 0) {
    label = `${hours}godz. ${minutes}min.`;
  } else {
    label = `${minutes}min.`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isUrgent: hoursUntil < 8,
    label,
  };
}
