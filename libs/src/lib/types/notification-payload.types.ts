/**
 * Pod-statusy zdarzeń uczestnictwa raportowanych pod NotificationKind.PARTICIPATION_STATUS.
 *
 * Jedyne źródło prawdy dla zbioru zdarzeń uczestnictwa w powiadomieniach. Część z nich
 * ma szablon e-mail transakcyjnego (libs/email), a część jest wyłącznie in-app/push
 * (np. SPOT_AVAILABLE, LOTTERY_NOT_SELECTED) - decyzję o renderowalności podejmuje
 * warstwa e-mail, nie ten kontrakt.
 */
export type ParticipationNotificationStatus =
  | 'SLOT_ASSIGNED'
  | 'APPROVAL_REMINDER'
  | 'CONFIRMED'
  | 'REMOVED'
  | 'REJECTED'
  | 'SPOT_AVAILABLE'
  | 'LOTTERY_NOT_SELECTED';

const PARTICIPATION_NOTIFICATION_STATUSES: readonly ParticipationNotificationStatus[] = [
  'SLOT_ASSIGNED',
  'APPROVAL_REMINDER',
  'CONFIRMED',
  'REMOVED',
  'REJECTED',
  'SPOT_AVAILABLE',
  'LOTTERY_NOT_SELECTED',
];

/**
 * Typowany payload strukturalny powiadomienia (Notification.data).
 *
 * Niesie dane domenowe potrzebne kanałom asynchronicznym (np. e-mail transakcyjny
 * wysyłany później przez cron eskalacji), których nie da się wiarygodnie odtworzyć
 * ze zlokalizowanego, przeznaczonego dla UI title/body powiadomienia.
 *
 * Discriminator `kind` odpowiada wartościom NotificationKind. Kolejne warianty
 * (EVENT_REMINDER, PAYMENT_CANCELLED, ANNOUNCEMENT) dodawaj tutaj - dzięki temu
 * warstwa e-mail czyta payload zamiast parsować tekst.
 */
export type NotificationPayload = {
  kind: 'PARTICIPATION_STATUS';
  status: ParticipationNotificationStatus;
};

/**
 * Bezpiecznie parsuje surową wartość kolumny Notification.data do typowanego payloadu.
 *
 * Zwraca null dla wartości nieznanych lub niekompletnych (np. starsze wiersze sprzed
 * wprowadzenia payloadu) - warstwa konsumująca decyduje wtedy, jak zareagować, zamiast
 * zgadywać na podstawie zlokalizowanego tekstu.
 */
export function parseNotificationPayload(data: unknown): NotificationPayload | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (record['kind'] === 'PARTICIPATION_STATUS') {
    const status = record['status'];
    const isKnownStatus =
      typeof status === 'string' &&
      PARTICIPATION_NOTIFICATION_STATUSES.includes(status as ParticipationNotificationStatus);
    if (isKnownStatus) {
      return { kind: 'PARTICIPATION_STATUS', status: status as ParticipationNotificationStatus };
    }
  }

  return null;
}
