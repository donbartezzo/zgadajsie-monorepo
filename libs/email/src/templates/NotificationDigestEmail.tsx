import { Link, Section, Text } from '@react-email/components';
import React from 'react';
import { Divider } from '../components/Divider';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../constants/brand';
import { EMAIL_THEME } from '../theme';
import type { NotificationDigestEmailProps } from '../types/templates';
import { DateTime } from 'luxon';
import { APP_LOCALE } from '../../../src/lib/constants/timezone.constants';

const c = EMAIL_THEME.colors;

export default function NotificationDigestEmail({
  displayName = 'Użytkownik',
  frontendUrl = 'https://zgadajsie.pl',
  items = [],
}: NotificationDigestEmailProps) {
  return (
    <TransactionalLayout
      preview={`Masz ${items.length} nieprzeczytanych powiadomień – ${APP_BRAND.NAME}`}
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
          Hej {displayName}!
        </Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: c.neutral[500] }}>
          Masz {items.length} nieprzeczytanych powiadomień na {APP_BRAND.NAME}.
        </Text>

        <Divider />

        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: '16px' }}>
            <Text
              style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: c.neutral[900],
              }}
            >
              {item.title}
            </Text>
            <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: c.neutral[500] }}>
              {item.body}
            </Text>
            <Text style={{ margin: '0 0 8px 0', fontSize: '12px', color: c.neutral[400] }}>
              {DateTime.fromJSDate(item.createdAt).setLocale(APP_LOCALE).toRelative()}
            </Text>
            {item.link && (
              <Link
                href={item.link}
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: c.primary[500],
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Zobacz szczegóły
              </Link>
            )}
          </div>
        ))}

        <Divider />

        <Text style={{ margin: '12px 0 0 0', fontSize: '13px', color: c.neutral[500] }}>
          <Link href={`${frontendUrl}/powiadomienia`} style={{ color: c.primary[500] }}>
            Zobacz wszystkie powiadomienia →
          </Link>
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
