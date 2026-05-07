/**
 * Buduje pełny URL wydarzenia na podstawie citySlug i eventId.
 * FRONTEND_URL jest pobierany z process.env.
 */
export function buildEventUrl(citySlug: string, eventId: string): string {
  const frontendUrl = process.env['FRONTEND_URL'] ?? 'https://zgadajsie.pl';
  return `${frontendUrl}/w/${citySlug}/${eventId}`;
}
