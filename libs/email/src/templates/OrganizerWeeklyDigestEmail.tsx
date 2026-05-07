import { Link } from '@react-email/link';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import React from 'react';
import { Callout } from '../components/Callout';
import { Divider } from '../components/Divider';
import { EventRow } from '../components/EventRow';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../constants/brand';
import { EMAIL_THEME } from '../theme';
import type { OrganizerWeeklyDigestEmailProps } from '../types/templates';

const c = EMAIL_THEME.colors;

export default function OrganizerWeeklyDigestEmail({
  displayName = 'Organizator',
  frontendUrl = 'https://zgadajsie.pl',
  pendingConfirmations = [],
  upcoming = [],
  recentlyCreated = [],
  recentlyEnded = [],
  recentlyCancelled = [],
  activeSeries = [],
}: OrganizerWeeklyDigestEmailProps) {
  const hasPending = pendingConfirmations.length > 0;
  const hasSuspended = activeSeries.some((s) => s.suspendedReason);

  return (
    <TransactionalLayout preview={`Tygodniowy raport organizatora – ${APP_BRAND.NAME}`}>
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
          Hej {displayName}!
        </Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: c.neutral[500] }}>
          Oto Twój tygodniowy raport z aktywnością na {APP_BRAND.NAME}.
        </Text>

        {hasSuspended && (
          <Callout variant="danger" label="Seria wstrzymana">
            Jedna lub więcej Twoich serii wydarzeń jest wstrzymana z powodu niepotwierdzonych
            wydarzeń.{' '}
            <Link href={`${frontendUrl}/profile/organizer/digest`} style={{ color: c.danger[500] }}>
              Przejdź do panelu →
            </Link>
          </Callout>
        )}

        {hasPending && (
          <>
            <Divider />
            <Text
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: c.warning[400],
              }}
            >
              Do potwierdzenia ({pendingConfirmations.length})
            </Text>
            <Text style={{ margin: '0 0 12px 0', fontSize: '13px', color: c.neutral[500] }}>
              Poniższe wydarzenia zostały wygenerowane automatycznie i czekają na Twoje
              potwierdzenie.
            </Text>
            {pendingConfirmations.map((e) => (
              <EventRow
                key={e.id}
                title={e.title}
                date={`${e.seriesName ? `Seria: ${e.seriesName} · ` : ''}${e.startsAt}`}
                actionHref={
                  e.confirmToken
                    ? `${frontendUrl}/o/confirm-event?token=${e.confirmToken}`
                    : undefined
                }
                actionLabel={e.confirmToken ? 'Potwierdź' : undefined}
              />
            ))}
          </>
        )}

        {activeSeries.length > 0 && (
          <>
            <Divider />
            <Text
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: c.neutral[900],
              }}
            >
              Aktywne serie ({activeSeries.length})
            </Text>
            {activeSeries.map((s) => (
              <Text
                key={s.id}
                style={{ margin: '0 0 6px 0', fontSize: '14px', color: c.neutral[900] }}
              >
                <strong>{s.name}</strong>
                {s.suspendedReason && <span style={{ color: c.danger[500] }}> — WSTRZYMANA</span>}
                {s.pendingCount > 0 && (
                  <span style={{ color: c.warning[400] }}> ({s.pendingCount} oczekujące)</span>
                )}
              </Text>
            ))}
          </>
        )}

        <Divider />
        <Text
          style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: c.neutral[900],
          }}
        >
          Podsumowanie
        </Text>
        {upcoming.length > 0 && (
          <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
            · <strong>{upcoming.length}</strong> nadchodzących wydarzeń
          </Text>
        )}
        {recentlyCreated.length > 0 && (
          <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
            · <strong>{recentlyCreated.length}</strong> nowo utworzonych wydarzeń
          </Text>
        )}
        {recentlyEnded.length > 0 && (
          <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
            · <strong>{recentlyEnded.length}</strong> zakończonych wydarzeń
          </Text>
        )}
        {recentlyCancelled.length > 0 && (
          <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
            · <strong>{recentlyCancelled.length}</strong> anulowanych wydarzeń
          </Text>
        )}
        <Text style={{ margin: '12px 0 0 0', fontSize: '13px', color: c.neutral[500] }}>
          <Link href={`${frontendUrl}/profile/organizer/digest`} style={{ color: c.primary[500] }}>
            Zobacz pełne zestawienie →
          </Link>
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
