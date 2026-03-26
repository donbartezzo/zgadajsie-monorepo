import { EventGender } from '@zgadajsie/shared';

export function formatEventGender(gender: EventGender | string | null | undefined): string {
  if (!gender || gender === 'ANY') return 'Wszyscy';
  if (gender === 'MALE') return 'Mężczyźni';
  if (gender === 'FEMALE') return 'Kobiety';
  return gender;
}

export function formatEventAgeRange(
  ageMin: number | null | undefined,
  ageMax: number | null | undefined,
): string | null {
  if (ageMin && ageMax) return `${ageMin}–${ageMax} lat`;
  if (ageMin) return `od ${ageMin} lat`;
  if (ageMax) return `do ${ageMax} lat`;
  return null;
}

export function formatEventAddress(address: string | null | undefined): string {
  return address ?? '';
}
