import { Section } from '@react-email/section';
import React from 'react';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../../../src/lib/constants/brand.constants';
import type { ReprimandEmailProps } from '../types/templates';

export default function ReprimandEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  reason = 'Powód reprymendy',
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: ReprimandEmailProps) {
  return (
    <TransactionalLayout
      preview={`Reprymenda od organizatora – ${APP_BRAND.NAME}`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Text>
          Otrzymałeś reprymendę za zachowanie na wydarzeniu <strong>{eventTitle}</strong>.
        </Text>
        <Callout variant="danger" label="Powód reprymendy">
          {reason}
        </Callout>
        <Text variant="muted">
          Prosimy o przestrzeganie zasad społeczności {APP_BRAND.NAME}. Kolejne naruszenia mogą
          skutkować ograniczeniem dostępu do platformy.
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
