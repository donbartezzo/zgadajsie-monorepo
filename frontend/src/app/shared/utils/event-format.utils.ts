import { EventGender } from '@zgadajsie/shared';

export function formatEventGender(gender: EventGender | string | null | undefined): string {
  if (!gender || gender === 'ANY') return 'Dowolona';
  if (gender === 'MALE') return 'Mężczyźni';
  if (gender === 'FEMALE') return 'Kobiety';
  return gender;
}

export function formatEventAgeRange(
  ageMin: number | null | undefined,
  ageMax: number | null | undefined,
): string {
  if (ageMin && ageMax) return `${ageMin}–${ageMax} lat`;
  if (ageMin) return `od ${ageMin} lat`;
  if (ageMax) return `do ${ageMax} lat`;
  return 'Bez ograniczeń';
}

export function formatEventAddress(
  address: string | null | undefined,
  cityName?: string | null | undefined,
): string {
  if (!address && !cityName) return '';
  if (!address) return cityName ?? '';
  if (!cityName) return address;
  return address + ', ' + cityName;
}

export function formatEventParticipants(count?: number | null): string {
  if (!count) return 'Bez ograniczeń';
  if (count === 1) return '1 osoba';
  if (count >= 2 && count <= 4) return `${count} osoby`;
  return `${count} osób`;
}
