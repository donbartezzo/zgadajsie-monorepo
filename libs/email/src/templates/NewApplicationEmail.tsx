import { Section } from '@react-email/components';
import React from 'react';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import type { NewApplicationEmailProps } from '../types/templates';

export default function NewApplicationEmail({
  organizerName = 'Organizator',
  applicantName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  manageLink = '#',
  eventLink,
  showGroupChat = false,
  showOrganizerChat = false,
}: NewApplicationEmailProps) {
  return (
    <TransactionalLayout
      preview={`Nowe zgłoszenie do wydarzenia: ${eventTitle}`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
      showEventLinkButton={false}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {organizerName}!</Text>
        <Text>
          Użytkownik <strong>{applicantName}</strong> zgłosił się do Twojego wydarzenia{' '}
          <strong>{eventTitle}</strong>.
        </Text>
        <Section style={{ textAlign: 'center' }}>
          <Button href={manageLink}>Zarządzaj zgłoszeniami</Button>
        </Section>
      </Section>
    </TransactionalLayout>
  );
}
