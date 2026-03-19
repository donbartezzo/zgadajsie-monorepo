import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_HOUR } from '../constants/date.constants';

/**
 * Zwraca nową datę przesuniętą o określoną liczbę dni w przód od danej daty.
 *
 * @param days - liczba dni do dodania (może być ujemna, aby odjąć)
 * @param now - data bazowa (domyślnie Date.now())
 */
export function daysFromNow(days: number, now = new Date()): Date {
  return new Date(now.getTime() + days * MILLISECONDS_PER_DAY);
}

/**
 * Zwraca nową datę przesuniętą o określoną liczbę godzin w przód od danej daty.
 *
 * @param hours - liczba godzin do dodania (może być ujemna, aby odjąć)
 * @param now - data bazowa (domyślnie Date.now())
 */
export function hoursFromNow(hours: number, now = new Date()): Date {
  return new Date(now.getTime() + hours * MILLISECONDS_PER_HOUR);
}

/**
 * Dodaje określoną liczbę godzin do daty.
 *
 * @param date - data bazowa (string ISO lub Date)
 * @param hours - liczba godzin do dodania (może być ujemna, aby odjąć)
 * @returns nowa data z dodanymi godzinami
 */
export function addHours(date: string | Date, hours: number): Date {
  const baseDate = new Date(date);
  return new Date(baseDate.getTime() + hours * MILLISECONDS_PER_HOUR);
}

/**
 * Odejmuje określoną liczbę godzin od daty.
 *
 * @param date - data bazowa (string ISO lub Date)
 * @param hours - liczba godzin do odjęcia (może być ujemna, aby dodać)
 * @returns nowa data z odjętymi godzinami
 */
export function subtractHours(date: string | Date, hours: number): Date {
  return addHours(date, -hours);
}

/**
 * Oblicza różnicę w pełnych dniach kalendarzowych między dwiema datami.
 * Wartość dodatnia = data jest w przyszłości w stosunku do now, ujemna = przeszłość, 0 = ten sam dzień.
 */
export function getDaysDiff(date: string | Date, now: string | Date = new Date()): number {
  const d = new Date(date);
  const n = new Date(now);
  const startOfNow = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDate.getTime() - startOfNow.getTime()) / MILLISECONDS_PER_DAY);
}
