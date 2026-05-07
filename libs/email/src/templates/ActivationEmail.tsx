import { Section } from '@react-email/components';
import React from 'react';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../constants/brand';
import type { ActivationEmailProps } from '../types/templates';

export default function ActivationEmail({
  displayName = 'Jan Kowalski',
  activationLink = '#',
}: ActivationEmailProps) {
  return (
    <TransactionalLayout preview={`Aktywuj swoje konto w ${APP_BRAND.NAME}`}>
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Witaj {displayName}!</Text>
        <Text>
          Dziękujemy za rejestrację w {APP_BRAND.NAME}. Kliknij poniżej, aby aktywować konto.
        </Text>
        <Section style={{ textAlign: 'center' }}>
          <Button href={activationLink}>Aktywuj konto</Button>
        </Section>
        <Text variant="muted" style={{ marginTop: '16px' }}>
          Link wygasa po 24 godzinach. Jeśli nie rejestrowano konta, zignoruj tę wiadomość.
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
