import { Section } from '@react-email/components';
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
  buttonLabel: string;
};

const STATUS_CONFIG: Record<ParticipationStatus, StatusConfig> = {
  SLOT_ASSIGNED: {
    subject: 'Przydzielono miejsce',
    preview: 'Masz przydzielone miejsce — potwierdź uczestnictwo',
    calloutVariant: 'warning',
    calloutLabel: 'Wymagane potwierdzenie',
    body: (eventTitle) => (
      <>
        Masz przydzielone miejsce na wydarzeniu <strong>{eventTitle}</strong>, jednak organizator
        wymaga potwierdzenia uczestnictwa - kliknij poniższy przycisk, aby potwierdzić swój udział.{' '}
        <u>Bez potwierdzenia Twoje uczestnictwo może zostać anulowane</u>.
      </>
    ),
    showLink: true,
    buttonLabel: 'Potwierdź uczestnictwo',
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
    buttonLabel: 'Potwierdź uczestnictwo',
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
    buttonLabel: 'Zobacz wydarzenie',
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
    buttonLabel: 'Zobacz wydarzenie',
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
    buttonLabel: 'Zobacz wydarzenie',
  },
};

export default function ParticipationStatusEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  status = 'SLOT_ASSIGNED',
  eventLink,
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
            <Button href={eventLink}>{config.buttonLabel}</Button>
          </Section>
        )}
      </Section>
    </TransactionalLayout>
  );
}
