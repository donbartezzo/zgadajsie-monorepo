import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import React from 'react';
import { Callout } from '../components/Callout';
import { Divider } from '../components/Divider';
import { Footer } from '../components/Footer';
import { APP_BRAND } from '../constants/brand';
import { EMAIL_THEME } from '../theme';
import type { ContactEmailProps } from '../types/templates';
import { ContactSource } from '../../../src/lib/enums/contact-source.enum';

const c = EMAIL_THEME.colors;

export default function ContactEmail({
  senderName = 'Jan Kowalski',
  senderEmail = 'jan@example.com',
  message = 'Przykładowa wiadomość',
  source = ContactSource.CONTACT_PAGE,
  citySlug,
  referenceNumber,
}: ContactEmailProps) {
  const sourceLabel =
    source === ContactSource.CONTACT_PAGE ? 'Strona kontaktowa' : 'Lista wydarzeń miasta';

  return (
    <Html lang="pl">
      <Head />
      <Preview>
        {referenceNumber
          ? `[${referenceNumber}] Wiadomość z formularza kontaktowego od ${senderName}`
          : `Wiadomość z formularza kontaktowego od ${senderName}`}
      </Preview>
      <Body style={{ backgroundColor: c.neutral[50], fontFamily: 'sans-serif', margin: 0 }}>
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: c.white,
            borderRadius: '8px',
          }}
        >
          <Section style={{ padding: '16px 0' }}>
            <Text
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: c.neutral[900],
              }}
            >
              Wiadomość z formularza kontaktowego
            </Text>
            <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
              <strong>Imię:</strong> {senderName}
            </Text>
            <Text style={{ margin: '0 0 12px 0', fontSize: '14px', color: c.neutral[900] }}>
              <strong>Email:</strong> {senderEmail}
            </Text>
            <Divider />
            <Callout variant="info" label="Wiadomość">
              {message}
            </Callout>
            <Divider />
            {sourceLabel && (
              <Text
                style={{
                  margin: '12px 0 0 0',
                  fontSize: '12px',
                  color: c.neutral[500],
                }}
              >
                {referenceNumber && ` Numer referencyjny: ${referenceNumber}`}
                <br />
                Źródło: {sourceLabel} {citySlug && ` ${citySlug}`}
              </Text>
            )}
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

ContactEmail.displayName = `${APP_BRAND.NAME} – formularz kontaktowy`;
