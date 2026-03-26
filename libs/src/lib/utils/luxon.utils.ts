import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE, APP_LOCALE } from '../constants/timezone.constants';

// ── Core ──

/**
 * Parsuje dowolne wejście (ISO string, Date) do Luxon DateTime w podanej strefie.
 * Jeśli wejście to string bez info o strefie, traktuje go jako UTC.
 */
export function toZonedDateTime(
  date: string | Date,
  zone: string = APP_DEFAULT_TIMEZONE,
): DateTime {
  if (date instanceof Date) {
    return DateTime.fromJSDate(date, { zone });
  }
  return DateTime.fromISO(date, { zone });
}

/**
 * Zwraca bieżący czas w podanej strefie.
 */
export function nowInZone(zone: string = APP_DEFAULT_TIMEZONE): DateTime {
  return DateTime.now().setZone(zone);
}

/**
 * Tworzy DateTime z konkretnych wartości (rok, miesiąc, dzień, godzina, minuta) w podanej strefie.
 */
export function createDateInZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  zone: string = APP_DEFAULT_TIMEZONE,
): DateTime {
  return DateTime.fromObject({ year, month, day, hour, minute, second: 0 }, { zone });
}

// ── Formatting ──

/**
 * "26 mar 2026, 19:00" — do emaili i powiadomień.
 */
export function formatDateTime(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).setLocale(APP_LOCALE).toFormat('d LLL yyyy, HH:mm');
}

/**
 * "26 marca 2026" — pełna data z odmianą miesiąca.
 */
export function formatDateFull(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).setLocale(APP_LOCALE).toFormat('d LLLL yyyy');
}

/**
 * "środa, 26 marca" — dzień tygodnia + data (do listy wydarzeń).
 */
export function formatDateLong(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).setLocale(APP_LOCALE).toFormat('EEEE, d LLLL');
}

/**
 * "MAR" — skrócona nazwa miesiąca uppercase (do date badge).
 */
export function formatMonthShort(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).setLocale(APP_LOCALE).toFormat('LLL').toUpperCase();
}

/**
 * "środa" — nazwa dnia tygodnia (do opisu wydarzenia).
 */
export function formatDayOfWeek(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).setLocale(APP_LOCALE).toFormat('EEEE');
}

/**
 * "19:00" — godzina i minuta (do wyświetlania czasu).
 */
export function formatTime(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).toFormat('HH:mm');
}

/**
 * Zwraca numer dnia miesiąca (np. 26) — do date badge.
 */
export function getDayOfMonth(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): number {
  return toZonedDateTime(date, zone).day;
}

/**
 * Sprawdza czy dwie daty wypływają na ten sam dzień kalendarzowy w danej strefie.
 */
export function isSameDay(
  a: string | Date,
  b: string | Date,
  zone: string = APP_DEFAULT_TIMEZONE,
): boolean {
  const dtA = toZonedDateTime(a, zone);
  const dtB = toZonedDateTime(b, zone);
  return dtA.hasSame(dtB, 'day');
}

// ── datetime-local input ──

/**
 * Konwertuje datę UTC na wartość dla HTML <input type="datetime-local">.
 * Zwraca string w formacie "YYYY-MM-DDTHH:mm" w podanej strefie.
 */
export function toLocalInputValue(
  date: string | Date,
  zone: string = APP_DEFAULT_TIMEZONE,
): string {
  return toZonedDateTime(date, zone).toFormat("yyyy-MM-dd'T'HH:mm");
}

/**
 * Konwertuje wartość z <input type="datetime-local"> na ISO UTC string.
 * Input: "2026-03-26T19:00" (interpretowany w podanej strefie)
 * Output: "2026-03-26T18:00:00.000+01:00" → toUTC → "2026-03-26T17:00:00.000Z" (zimą CET)
 */
export function fromLocalInputValue(value: string, zone: string = APP_DEFAULT_TIMEZONE): string {
  const iso = DateTime.fromISO(value, { zone }).toUTC().toISO();
  if (!iso) {
    throw new Error(`Invalid datetime-local value: "${value}"`);
  }
  return iso;
}

// ── Timezone-aware getDaysDiff ──

/**
 * Oblicza różnicę w pełnych dniach kalendarzowych między dwiema datami
 * z uwzględnieniem strefy czasowej.
 *
 * Wartość dodatnia = data jest w przyszłości, ujemna = przeszłość, 0 = ten sam dzień.
 */
export function getDaysDiffTz(
  date: string | Date,
  now: string | Date = new Date(),
  zone: string = APP_DEFAULT_TIMEZONE,
): number {
  const dtDate = toZonedDateTime(date, zone).startOf('day');
  const dtNow = toZonedDateTime(now, zone).startOf('day');
  return Math.round(dtDate.diff(dtNow, 'days').days);
}
