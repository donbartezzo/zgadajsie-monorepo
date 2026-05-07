import { Section } from '@react-email/components';
import React from 'react';
import { Button } from '../components/Button';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import type { EventReminderEmailProps } from '../types/templates';

export default function EventReminderEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  eventTime = '2024-01-01 12:00',
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: EventReminderEmailProps) {
  return (
    <TransactionalLayout
      preview={`Przypomnienie o wydarzeniu: ${eventTitle}`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
      showEventLinkButton={false}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Callout variant="info" label="Przypomnienie o wydarzeniu">
          Wydarzenie <strong>{eventTitle}</strong> rozpoczyna się <strong>{eventTime}</strong>.
        </Callout>
        <Section style={{ textAlign: 'center' }}>
          <Button href={eventLink}>Zobacz szczegóły</Button>
        </Section>
      </Section>
    </TransactionalLayout>
  );
}
