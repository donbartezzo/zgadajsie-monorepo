/**
 * Buduje pełny URL wydarzenia na podstawie citySlug i eventId.
 * frontendUrl musi być przekazany jako parametr (np. z ConfigService w backendzie).
 */
export function buildEventUrl(citySlug: string, eventId: string, frontendUrl: string): string {
  return `${frontendUrl.replace(/\/+$/, '')}/w/${citySlug}/${eventId}`;
}
