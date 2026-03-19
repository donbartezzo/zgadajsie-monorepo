/**
 * Stałe czasowe do obliczeń dat - używane zarówno na frontendzie jak i backendzie
 * Single source of truth dla wszystkich operacji na czasach
 */

// Podstawowe jednostki czasowe w milisekundach
export const MILLISECONDS_PER_SECOND = 1_000;
export const MILLISECONDS_PER_MINUTE = 60_000; // 60 * 1_000
export const MILLISECONDS_PER_HOUR = 3_600_000; // 60 * 60 * 1_000
export const MILLISECONDS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1_000

// Jednostki relatywne
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

// Stałe dla często używanych okresów
export const MILLISECONDS_PER_WEEK = DAYS_PER_WEEK * MILLISECONDS_PER_DAY;
export const MILLISECONDS_PER_MONTH = 30 * MILLISECONDS_PER_DAY; // przybliżenie
export const MILLISECONDS_PER_YEAR = 365 * MILLISECONDS_PER_DAY; // przybliżenie

// Stałe dla specyficznych okresów biznesowych
export const MILLISECONDS_PER_24_HOURS = 24 * MILLISECONDS_PER_HOUR;
export const MILLISECONDS_PER_48_HOURS = 48 * MILLISECONDS_PER_HOUR;
export const MILLISECONDS_PER_72_HOURS = 72 * MILLISECONDS_PER_HOUR;
