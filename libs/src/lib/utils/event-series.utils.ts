import { DateTime } from 'luxon';
import { EventSeriesRecurrenceType } from '../enums/event-series-recurrence-type.enum';
import { EventSeriesPreviewItem, RecurrenceConfig } from '../types/event-series.types';

interface AnchorOptions {
  time: string;
  timezone: string;
  from: Date;
  until: Date;
}

interface PreviewAnchorOptions {
  time: string;
  timezone: string;
  startDate: Date;
  durationMinutes: number;
}

/**
 * Parsuje "HH:mm" → { hour, minute }.
 */
function parseTime(time: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = time.split(':');
  return { hour: parseInt(hourStr, 10), minute: parseInt(minuteStr, 10) };
}

/**
 * Buduje DateTime w podanej strefie dla konkretnego dnia i godziny.
 * Używamy fromObject zamiast + ms, żeby Luxon sam obsłużył DST (godzina lokalna stała).
 */
function buildDt(date: DateTime, time: string, zone: string): DateTime {
  const { hour, minute } = parseTime(time);
  return DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day, hour, minute, second: 0, millisecond: 0 },
    { zone },
  );
}

/**
 * Zwraca wszystkie startsAt (UTC Date) dla serii w przedziale (from, until].
 * Godzina lokalna wynikowego daty jest stała (DST-safe dzięki Luxon).
 *
 * Konwencja daysOfWeek: 1 = pon, 2 = wt, ..., 7 = nd (ISO/Luxon weekday).
 */
export function computeNextDates(config: RecurrenceConfig, anchor: AnchorOptions): Date[] {
  const { time, timezone, from, until } = anchor;
  const fromDt = DateTime.fromJSDate(from, { zone: timezone });
  const untilDt = DateTime.fromJSDate(until, { zone: timezone });
  const results: Date[] = [];

  if (config.type === EventSeriesRecurrenceType.INTERVAL) {
    const { intervalDays } = config;
    let cursor = buildDt(fromDt, time, timezone);

    // Przesuń cursor do pierwszego momentu po from
    while (cursor <= fromDt) {
      cursor = cursor.plus({ days: intervalDays });
    }

    while (cursor <= untilDt) {
      results.push(cursor.toUTC().toJSDate());
      cursor = cursor.plus({ days: intervalDays });
    }
  } else {
    const { daysOfWeek } = config;
    if (!daysOfWeek || daysOfWeek.length === 0) return results;

    const sortedDow = [...daysOfWeek].sort((a, b) => a - b);
    let cursor = buildDt(fromDt, time, timezone);

    // Znajdź pierwszy dzień tygodnia po from
    // Iterujemy dzień po dniu, sprawdzając czy weekday pasuje
    for (let i = 0; i < 14; i++) {
      const nextDay = cursor.plus({ days: i });
      if (nextDay <= fromDt) continue;
      if (sortedDow.includes(nextDay.weekday)) {
        cursor = buildDt(nextDay, time, timezone);
        break;
      }
    }

    // Generuj kolejne daty, skanując dzień po dniu
    const scanCursor = buildDt(fromDt, time, timezone);
    let found = false;

    for (let dayOffset = 1; dayOffset <= 400; dayOffset++) {
      const candidate = buildDt(scanCursor.plus({ days: dayOffset }), time, timezone);
      if (candidate > untilDt) break;
      if (candidate <= fromDt) continue;
      if (sortedDow.includes(candidate.weekday)) {
        results.push(candidate.toUTC().toJSDate());
        found = true;
      }
    }

    void found;
  }

  return results;
}

/**
 * Zwraca pierwsze `count` terminów serii jako { start, end } w ISO UTC.
 * Używane do podglądu w UI i API preview.
 */
export function previewSeriesDates(
  config: RecurrenceConfig,
  anchor: PreviewAnchorOptions,
  count: number,
): EventSeriesPreviewItem[] {
  const { time, timezone, startDate, durationMinutes } = anchor;
  const until = DateTime.fromJSDate(startDate, { zone: timezone }).plus({ days: 400 }).toJSDate();

  const dates = computeNextDates(config, { time, timezone, from: startDate, until });

  return dates.slice(0, count).map((start) => {
    const startDt = DateTime.fromJSDate(start);
    const end = startDt.plus({ minutes: durationMinutes }).toJSDate();
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });
}
