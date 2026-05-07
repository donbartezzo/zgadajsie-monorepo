import { Section } from '@react-email/components';
import React from 'react';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import type { PaymentConfirmationEmailProps } from '../types/templates';

export default function PaymentConfirmationEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  amount = 50,
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: PaymentConfirmationEmailProps) {
  return (
    <TransactionalLayout
      preview={`Potwierdzenie płatności – ${eventTitle}`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Callout variant="success" label="Płatność zaksięgowana">
          Twoja płatność <strong>{amount} zł</strong> za wydarzenie <strong>{eventTitle}</strong>{' '}
          została zaksięgowana.
        </Callout>
      </Section>
    </TransactionalLayout>
  );
}
