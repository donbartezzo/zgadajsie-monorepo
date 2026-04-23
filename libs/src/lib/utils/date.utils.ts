import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE, APP_LOCALE } from '../constants/timezone.constants';
import {
  MILLISECONDS_PER_SECOND,
  MILLISECONDS_PER_MINUTE,
  MILLISECONDS_PER_HOUR,
  MILLISECONDS_PER_DAY,
} from '../constants/date.constants';

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
 * "26 kwietnia" — data bez roku (do sublabel).
 */
export function formatDateNoYear(date: string | Date, zone: string = APP_DEFAULT_TIMEZONE): string {
  return toZonedDateTime(date, zone).setLocale(APP_LOCALE).toFormat('d LLLL');
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

/**
 * Formatuje czytelny zakres terminu wydarzenia.
 *
 * Przykłady:
 * - "Piątek godz. 11:00 - 14:00"
 * - "Piątek godz. 11:00 - Sobota godz. 19:00"
 */
export function formatDateRangeLabel(
  startsAt: string | Date | undefined,
  endsAt: string | Date | undefined,
  zone: string = APP_DEFAULT_TIMEZONE,
): string {
  if (!startsAt || !endsAt) return '';

  const startDay = formatDayOfWeek(startsAt, zone);
  const endDay = formatDayOfWeek(endsAt, zone);
  const startTime = formatTime(startsAt, zone);
  const endTime = formatTime(endsAt, zone);
  const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

  if (isSameDay(startsAt, endsAt, zone)) {
    return `${formatDay(startDay)} godz. ${startTime} - ${endTime}`;
  }

  return `${formatDay(startDay)} godz. ${startTime} - ${formatDay(endDay)} godz. ${endTime}`;
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
  now?: string | Date,
  zone: string = APP_DEFAULT_TIMEZONE,
): number {
  const nowValue = now ?? nowInZone(zone).toJSDate();
  const dtDate = toZonedDateTime(date, zone).startOf('day');
  const dtNow = toZonedDateTime(nowValue, zone).startOf('day');
  return Math.round(dtDate.diff(dtNow, 'days').days);
}

/**
 * Oblicza czas trwania wydarzenia i zwraca surowe części.
 * Zwraca null dla nieprawidłowych danych lub ujemnego czasu.
 */
export function calculateDurationParts(
  startsAt: string | Date,
  endsAt: string | Date,
): {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
} | null {
  if (!startsAt || !endsAt) return null;

  const start = toZonedDateTime(startsAt);
  const end = toZonedDateTime(endsAt);
  const diffMs = end.diff(start).milliseconds;

  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / MILLISECONDS_PER_DAY);
  const hours = Math.floor((diffMs % MILLISECONDS_PER_DAY) / MILLISECONDS_PER_HOUR);
  const minutes = Math.floor((diffMs % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE);

  return { days, hours, minutes, totalMs: diffMs };
}

// ── Countdown utilities ──

export interface EventCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent: boolean;
  isEnded: boolean;
}

/**
 * Oblicza countdown do wydarzenia lub od zakończenia wydarzenia z uwzględnieniem strefy czasowej.
 *
 * Zwraca `null` jeśli:
 * - wydarzenie trwa (start <= now < end)
 * - do rozpoczęcia jest więcej niż `maxHours` godzin
 * - od zakończenia upłynęło więcej niż `maxHours` godzin
 *
 * Jeśli wydarzenie się zakończyło (end <= now) i upłynęło mniej niż `maxHours` godzin,
 * zwraca countdown od czasu zakończenia (ile czasu upłynęło od endsAt).
 *
 * @param startsAt - data rozpoczęcia wydarzenia (string ISO lub Date)
 * @param endsAt - data zakończenia wydarzenia (string ISO lub Date)
 * @param maxHours - maksymalna liczba godzin do wyświetlenia countdown (domyślnie 24)
 * @param zone - strefa czasowa (domyślnie APP_DEFAULT_TIMEZONE)
 */
export function getEventCountdown(
  startsAt: string | Date,
  endsAt: string | Date,
  maxHours = 24,
  zone: string = APP_DEFAULT_TIMEZONE,
): EventCountdown | null {
  const start = toZonedDateTime(startsAt, zone);
  const end = toZonedDateTime(endsAt, zone);
  const now = nowInZone(zone);

  // Wydarzenie trwa - nie pokazujemy countdown
  if (start <= now && end > now) return null;

  // Wydarzenie się zakończyło - obliczamy czas od zakończenia
  if (end <= now) {
    const msSinceEnd = now.diff(end).milliseconds;
    const hoursSinceEnd = msSinceEnd / MILLISECONDS_PER_HOUR;

    if (hoursSinceEnd > maxHours) return null;

    const timeParts = calculateTimeParts(msSinceEnd);

    return {
      ...timeParts,
      isUrgent: false,
      isEnded: true,
    };
  }

  // Wydarzenie jeszcze się nie zaczęło - obliczamy czas do rozpoczęcia
  const msUntil = start.diff(now).milliseconds;
  const hoursUntil = msUntil / MILLISECONDS_PER_HOUR;

  if (hoursUntil > maxHours) return null;

  const timeParts = calculateTimeParts(msUntil);

  return {
    ...timeParts,
    isUrgent: hoursUntil < 8,
    isEnded: false,
  };
}

/**
 * Pomocnicza funkcja do obliczania części czasu z milisekund.
 */
function calculateTimeParts(
  ms: number,
): Pick<EventCountdown, 'days' | 'hours' | 'minutes' | 'seconds'> {
  const days = Math.floor(ms / MILLISECONDS_PER_DAY);
  const hours = Math.floor((ms % MILLISECONDS_PER_DAY) / MILLISECONDS_PER_HOUR);
  const minutes = Math.floor((ms % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE);
  const seconds = Math.floor((ms % MILLISECONDS_PER_MINUTE) / MILLISECONDS_PER_SECOND);

  return { days, hours, minutes, seconds };
}

// ── Time arithmetic utilities ──

/**
 * Odejmuje określoną liczbę godzin od daty.
 */
export function subtractHours(date: string | Date, hours: number): Date {
  const dt = toZonedDateTime(date);
  return dt.minus({ hours }).toJSDate();
}

/**
 * Dodaje określoną liczbę godzin do daty.
 */
export function addHours(date: string | Date, hours: number): Date {
  const dt = toZonedDateTime(date);
  return dt.plus({ hours }).toJSDate();
}

/**
 * Zwraca datę z dodaną/odjętą liczbą dni od teraz.
 */
export function daysFromNow(days: number, from?: Date): Date {
  const base = from ? toZonedDateTime(from) : nowInZone();
  return base.plus({ days }).toJSDate();
}

/**
 * Zwraca datę z dodaną/odjętą liczbą godzin od teraz.
 */
export function hoursFromNow(hours: number, from?: Date): Date {
  const base = from ? toZonedDateTime(from) : nowInZone();
  return base.plus({ hours }).toJSDate();
}
