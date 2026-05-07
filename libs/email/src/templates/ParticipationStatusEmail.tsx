import { Section } from '@react-email/ui';
import React from 'react';
import { Button } from '../components/Button';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import type { ParticipationStatus, ParticipationStatusEmailProps } from '../types/templates';

type StatusConfig = {
  subject: string;
  preview: string;
  calloutVariant: 'info' | 'success' | 'warning' | 'danger';
  calloutLabel: string;
  body: (eventTitle: string) => React.ReactNode;
  showLink: boolean;
};

const STATUS_CONFIG: Record<ParticipationStatus, StatusConfig> = {
  SLOT_ASSIGNED: {
    subject: 'Przydzielono miejsce',
    preview: 'Masz przydzielone miejsce — potwierdź uczestnictwo',
    calloutVariant: 'info',
    calloutLabel: 'Przydzielono miejsce',
    body: (eventTitle) => (
      <>
        Masz przydzielone miejsce na wydarzeniu <strong>{eventTitle}</strong>. Potwierdź swoje
        uczestnictwo na stronie wydarzenia.
      </>
    ),
    showLink: true,
  },
  APPROVAL_REMINDER: {
    subject: 'Przypomnienie o potwierdzeniu',
    preview: 'Nie zapomnij potwierdzić uczestnictwa',
    calloutVariant: 'warning',
    calloutLabel: 'Przypomnienie',
    body: (eventTitle) => (
      <>
        Przypominamy, że masz przydzielone miejsce na wydarzeniu <strong>{eventTitle}</strong>.
        Potwierdź swoje uczestnictwo, aby nie stracić miejsca.
      </>
    ),
    showLink: true,
  },
  CONFIRMED: {
    subject: 'Uczestnictwo potwierdzone',
    preview: 'Twoje uczestnictwo zostało potwierdzone',
    calloutVariant: 'success',
    calloutLabel: 'Uczestnictwo potwierdzone',
    body: (eventTitle) => (
      <>
        Twoje uczestnictwo w wydarzeniu <strong>{eventTitle}</strong> zostało potwierdzone. Do
        zobaczenia!
      </>
    ),
    showLink: true,
  },
  REMOVED: {
    subject: 'Usunięcie z wydarzenia',
    preview: 'Twoje uczestnictwo zostało anulowane',
    calloutVariant: 'warning',
    calloutLabel: 'Uczestnictwo anulowane',
    body: (eventTitle) => (
      <>
        Twoje uczestnictwo w wydarzeniu <strong>{eventTitle}</strong> zostało anulowane przez
        organizatora.
      </>
    ),
    showLink: false,
  },
  REJECTED: {
    subject: 'Zgłoszenie odrzucone',
    preview: 'Twoje zgłoszenie zostało odrzucone',
    calloutVariant: 'danger',
    calloutLabel: 'Zgłoszenie odrzucone',
    body: (eventTitle) => (
      <>
        Twoje zgłoszenie do wydarzenia <strong>{eventTitle}</strong> zostało odrzucone.
      </>
    ),
    showLink: false,
  },
};

export default function ParticipationStatusEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  status = 'SLOT_ASSIGNED',
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: ParticipationStatusEmailProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.REJECTED;
  return (
    <TransactionalLayout
      preview={config.preview}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
      showEventLinkButton={false}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Callout variant={config.calloutVariant} label={config.calloutLabel}>
          {config.body(eventTitle)}
        </Callout>
        {config.showLink && eventLink && (
          <Section style={{ textAlign: 'center' }}>
            <Button href={eventLink}>Zobacz wydarzenie</Button>
          </Section>
        )}
      </Section>
    </TransactionalLayout>
  );
}
