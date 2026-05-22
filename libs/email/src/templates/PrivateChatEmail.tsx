import { Section } from '@react-email/components';
import React from 'react';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';

interface PrivateChatEmailProps {
  displayName?: string;
  senderName?: string;
  eventTitle?: string;
  unreadCount?: number;
  chatUrl?: string;
}

export default function PrivateChatEmail({
  displayName = 'Jan Kowalski',
  senderName = 'Organizator',
  eventTitle = 'Przykładowe wydarzenie',
  unreadCount = 1,
  chatUrl = '#',
}: PrivateChatEmailProps) {
  return (
    <TransactionalLayout
      preview={`Nowa prywatna wiadomość – ${eventTitle}`}
      eventLink={chatUrl}
      showGroupChat={false}
      showOrganizerChat={false}
      showEventLinkButton={false}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Text>
          Masz {unreadCount} nieprzeczytanych wiadomości od <strong>{senderName}</strong> w wydarzeniu{' '}
          <strong>{eventTitle}</strong>.
        </Text>
        <Text variant="muted">Kliknij poniżej, aby przejść do czatu.</Text>
        <Section style={{ textAlign: 'center' }}>
          <Button href={chatUrl}>Otwórz czat</Button>
        </Section>
      </Section>
    </TransactionalLayout>
  );
}
