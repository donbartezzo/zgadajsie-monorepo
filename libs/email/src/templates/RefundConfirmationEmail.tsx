import { Section } from '@react-email/ui';
import React from 'react';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import type { RefundConfirmationEmailProps } from '../types/templates';

export default function RefundConfirmationEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  amount = 50,
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: RefundConfirmationEmailProps) {
  return (
    <TransactionalLayout
      preview={`Zwrot płatności – ${eventTitle}`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Callout variant="info" label="Zwrot zlecony">
          Zwrot <strong>{amount} zł</strong> za wydarzenie <strong>{eventTitle}</strong> został
          zlecony. Środki powinny pojawić się na Twoim koncie w ciągu kilku dni roboczych.
        </Callout>
      </Section>
    </TransactionalLayout>
  );
}
