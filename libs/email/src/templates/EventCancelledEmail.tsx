import { Section } from '@react-email/components';
import React from 'react';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../constants/brand';
import type { EventCancelledEmailProps } from '../types/templates';

export default function EventCancelledEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: EventCancelledEmailProps) {
  return (
    <TransactionalLayout
      preview={`${APP_BRAND.NAME} - Wydarzenie ${eventTitle} zostało anulowane`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Callout variant="warning" label="Wydarzenie anulowane">
          Wydarzenie <strong>{eventTitle}</strong>, w którym uczestniczysz, zostało anulowane przez
          organizatora.
        </Callout>
        <Text variant="muted">
          Jeśli masz pytania, skontaktuj się bezpośrednio z organizatorem.
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
