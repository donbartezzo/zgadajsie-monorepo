import { Section } from '@react-email/section';
import React from 'react';
import { Button } from '../components/Button';
import { Callout } from '../components/Callout';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import type { AnnouncementEmailProps } from '../types/templates';

type PriorityConfig = {
  calloutVariant: 'info' | 'warning' | 'danger';
  label: string;
};

const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  CRITICAL: { calloutVariant: 'danger', label: 'PILNE – Krytyczny komunikat' },
  ORGANIZATIONAL: { calloutVariant: 'warning', label: 'Organizacyjny' },
  INFO: { calloutVariant: 'info', label: 'Informacyjny' },
};

export default function AnnouncementEmail({
  displayName = 'Jan Kowalski',
  eventTitle = 'Przykładowe wydarzenie',
  message = 'Przykładowa wiadomość',
  priority = 'INFO',
  confirmLink = '#',
  eventLink = 'https://zgadajsie.pl/w/warszawa/123',
  showGroupChat = true,
  showOrganizerChat = true,
}: AnnouncementEmailProps) {
  const { calloutVariant, label } = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG['INFO'];
  const previewPrefix = priority === 'CRITICAL' ? '[PILNE] ' : '';

  return (
    <TransactionalLayout
      preview={`${previewPrefix}Komunikat organizatora – ${eventTitle}`}
      eventLink={eventLink}
      showGroupChat={showGroupChat}
      showOrganizerChat={showOrganizerChat}
      showEventLinkButton={false}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Hej {displayName}!</Text>
        <Text>
          Organizator wydarzenia <strong>{eventTitle}</strong> wysłał komunikat:
        </Text>
        <Callout variant={calloutVariant} label={label}>
          {message}
        </Callout>
        <Text variant="muted">Kliknij poniżej, aby potwierdzić odbiór tego powiadomienia.</Text>
        <Section style={{ textAlign: 'center' }}>
          <Button href={confirmLink}>Potwierdzam odbiór</Button>
        </Section>
      </Section>
    </TransactionalLayout>
  );
}
