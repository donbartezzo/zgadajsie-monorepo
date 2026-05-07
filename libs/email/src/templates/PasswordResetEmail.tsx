import { Section } from '@react-email/section';
import React from 'react';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../../../src/lib/constants/brand.constants';
import type { PasswordResetEmailProps } from '../types/templates';

export default function PasswordResetEmail({ resetLink = '#' }: PasswordResetEmailProps) {
  return (
    <TransactionalLayout preview={`Reset hasła – ${APP_BRAND.NAME}`}>
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text>Reset hasła</Text>
        <Text>Kliknij poniższy link, aby ustawić nowe hasło:</Text>
        <Section style={{ textAlign: 'center' }}>
          <Button href={resetLink}>Ustaw nowe hasło</Button>
        </Section>
        <Text variant="muted" style={{ marginTop: '16px' }}>
          Link wygasa po 1 godzinie. Jeśli nie wnioskowano o reset, zignoruj tę wiadomość.
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
