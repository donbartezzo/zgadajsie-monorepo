import { Body, Container, Head, Html, Preview } from '@react-email/components';
import React from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { EMAIL_THEME } from '../theme';

const c = EMAIL_THEME.colors;

interface TransactionalLayoutProps {
  preview: string;
  children: React.ReactNode;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
  showEventLinkButton?: boolean;
}

export function TransactionalLayout({
  preview,
  children,
  eventLink,
  showGroupChat,
  showOrganizerChat,
  showEventLinkButton,
}: TransactionalLayoutProps) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{preview}</Preview>
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
          <Header />
          {children}
          <Footer
            eventLink={eventLink}
            showGroupChat={showGroupChat}
            showOrganizerChat={showOrganizerChat}
            showEventLinkButton={showEventLinkButton}
          />
        </Container>
      </Body>
    </Html>
  );
}
