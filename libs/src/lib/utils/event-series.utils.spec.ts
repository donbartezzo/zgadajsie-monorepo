import { DateTime } from 'luxon';
import { EventSeriesRecurrenceType } from '../enums/event-series-recurrence-type.enum';
import { RecurrenceConfig } from '../types/event-series.types';
import { computeNextDates, previewSeriesDates } from './event-series.utils';

const TZ = 'Europe/Warsaw';

function makeDate(isoLocal: string): Date {
  return DateTime.fromISO(isoLocal, { zone: TZ }).toJSDate();
}

function localHour(date: Date): number {
  return DateTime.fromJSDate(date, { zone: TZ }).hour;
}

function localMinute(date: Date): number {
  return DateTime.fromJSDate(date, { zone: TZ }).minute;
}

function isoWeekday(date: Date): number {
  return DateTime.fromJSDate(date, { zone: TZ }).weekday;
}

describe('computeNextDates - INTERVAL', () => {
  it('generuje co 7 dni', () => {
    // from = już wygenerowany 1 maja 20:00 → następne daty: 8, 15, 22 maja
    const from = makeDate('2026-05-01T20:00:00');
    const until = makeDate('2026-05-22T23:59:59');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.INTERVAL, intervalDays: 7 };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });

    expect(dates).toHaveLength(3);
    expect(DateTime.fromJSDate(dates[0], { zone: TZ }).toFormat('yyyy-MM-dd')).toBe('2026-05-08');
    expect(DateTime.fromJSDate(dates[1], { zone: TZ }).toFormat('yyyy-MM-dd')).toBe('2026-05-15');
    expect(DateTime.fromJSDate(dates[2], { zone: TZ }).toFormat('yyyy-MM-dd')).toBe('2026-05-22');
  });

  it('godzina lokalna stała przy przejściu lato → zima (2026-10-25)', () => {
    // PL przechodzi z CEST (UTC+2) na CET (UTC+1) ostatnią niedzielę października
    const from = makeDate('2026-10-20T19:00:00');
    const until = makeDate('2026-11-20T23:59:59');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.INTERVAL, intervalDays: 7 };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });

    expect(dates.length).toBeGreaterThanOrEqual(4);
    dates.forEach((d) => {
      expect(localHour(d)).toBe(20);
      expect(localMinute(d)).toBe(0);
    });
  });

  it('godzina lokalna stała przy przejściu zima → lato (2026-03-29)', () => {
    const from = makeDate('2026-03-20T19:00:00');
    const until = makeDate('2026-04-20T23:59:59');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.INTERVAL, intervalDays: 7 };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });

    expect(dates.length).toBeGreaterThanOrEqual(4);
    dates.forEach((d) => {
      expect(localHour(d)).toBe(20);
    });
  });

  it('zwraca puste jeśli from >= until', () => {
    const from = makeDate('2026-05-10T21:00:00');
    const until = makeDate('2026-05-10T20:00:00');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.INTERVAL, intervalDays: 7 };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });
    expect(dates).toHaveLength(0);
  });
});

describe('computeNextDates - WEEKLY', () => {
  it('generuje pon+czw przez dwa tygodnie', () => {
    // Startujemy z niedzieli
    const from = makeDate('2026-05-03T00:00:00');
    const until = makeDate('2026-05-17T23:59:59');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.WEEKLY, daysOfWeek: [1, 4] };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });

    expect(dates).toHaveLength(4);
    expect(isoWeekday(dates[0])).toBe(1); // pon
    expect(isoWeekday(dates[1])).toBe(4); // czw
    expect(isoWeekday(dates[2])).toBe(1); // pon
    expect(isoWeekday(dates[3])).toBe(4); // czw
  });

  it('godzina lokalna stała (WEEKLY) przy DST', () => {
    const from = makeDate('2026-10-22T00:00:00');
    const until = makeDate('2026-11-05T23:59:59');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.WEEKLY, daysOfWeek: [2] };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });

    expect(dates.length).toBeGreaterThanOrEqual(2);
    dates.forEach((d) => {
      expect(localHour(d)).toBe(20);
    });
  });

  it('zwraca puste jeśli daysOfWeek puste', () => {
    const from = makeDate('2026-05-01T00:00:00');
    const until = makeDate('2026-05-30T23:59:59');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.WEEKLY, daysOfWeek: [] };

    const dates = computeNextDates(config, { time: '20:00', timezone: TZ, from, until });
    expect(dates).toHaveLength(0);
  });

  it('endDate ucina bufor', () => {
    const from = makeDate('2026-05-01T00:00:00');
    const until = makeDate('2026-05-11T23:59:59');
    const config: RecurrenceConfig = {
      type: EventSeriesRecurrenceType.WEEKLY,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    };

    const dates = computeNextDates(config, { time: '10:00', timezone: TZ, from, until });
    // Powinniśmy mieć max do 11 maja
    dates.forEach((d) => {
      expect(d.getTime()).toBeLessThanOrEqual(until.getTime());
    });
  });
});

describe('previewSeriesDates', () => {
  it('zwraca count dat z poprawnymi start/end', () => {
    const startDate = makeDate('2026-05-01T00:00:00');
    const config: RecurrenceConfig = { type: EventSeriesRecurrenceType.WEEKLY, daysOfWeek: [1, 4] };

    const items = previewSeriesDates(
      config,
      { time: '20:00', timezone: TZ, startDate, durationMinutes: 60 },
      4,
    );

    expect(items).toHaveLength(4);
    items.forEach((item) => {
      const startMs = new Date(item.start).getTime();
      const endMs = new Date(item.end).getTime();
      expect(endMs - startMs).toBe(60 * 60 * 1000);
    });
  });
});
