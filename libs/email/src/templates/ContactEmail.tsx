import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Html } from '@react-email/html';
import { Preview } from '@react-email/preview';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import React from 'react';
import { Callout } from '../components/Callout';
import { Divider } from '../components/Divider';
import { Footer } from '../components/Footer';
import { APP_BRAND } from '../../../src/lib/constants/brand.constants';
import type { ContactEmailProps } from '../types/templates';

export default function ContactEmail({
  senderName = 'Jan Kowalski',
  senderEmail = 'jan@example.com',
  message = 'Przykładowa wiadomość',
}: ContactEmailProps) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>Wiadomość z formularza kontaktowego od {senderName}</Preview>
      <Body style={{ backgroundColor: '#f8f9fa', fontFamily: 'sans-serif', margin: 0 }}>
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
          }}
        >
          <Section style={{ padding: '16px 0' }}>
            <Text
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#1c1f23',
              }}
            >
              Wiadomość z formularza kontaktowego
            </Text>
            <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1c1f23' }}>
              <strong>Imię:</strong> {senderName}
            </Text>
            <Text style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1c1f23' }}>
              <strong>Email:</strong> {senderEmail}
            </Text>
            <Divider />
            <Callout variant="info" label="Wiadomość">
              {message}
            </Callout>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

ContactEmail.displayName = `${APP_BRAND.NAME} – formularz kontaktowy`;
