import { Column, Row, Section, Text } from '@react-email/components';
import React from 'react';
import { Callout } from '../components/Callout';
import { Divider } from '../components/Divider';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../constants/brand';
import { EMAIL_THEME } from '../theme';
import type { AdminDailyReportEmailProps } from '../types/templates';

const c = EMAIL_THEME.colors;

export default function AdminDailyReportEmail({
  date = '2024-01-01',
  environment = 'local',
  cronStatus = [],
  stats = { activeEvents: 0, totalUsers: 0, newUsersToday: 0 },
  logsCleaned = 0,
}: AdminDailyReportEmailProps) {
  const stuckCrons = cronStatus.filter((cron) => cron.status === 'STUCK');
  const errorCrons = cronStatus.filter((cron) => cron.status === 'ERROR');
  const hasIssues = stuckCrons.length > 0 || errorCrons.length > 0;

  return (
    <TransactionalLayout
      preview={
        hasIssues
          ? `[ALERT] Raport dzienny cronów – ${APP_BRAND.NAME}`
          : `Raport dzienny cronów – ${APP_BRAND.NAME}`
      }
    >
      <Section style={{ padding: '24px 0 0 0' }}>
        <Text
          style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: c.neutral[900],
          }}
        >
          Raport dzienny – {date}
        </Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '12px', color: c.neutral[500] }}>
          Środowisko: {environment}
        </Text>

        {hasIssues ? (
          <Callout variant="danger" label="Wykryto problemy z cronami!">
            {stuckCrons.length > 0 && (
              <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: c.neutral[900] }}>
                Zatkane crony ({stuckCrons.length}):{' '}
                {stuckCrons.map((cron) => cron.name).join(', ')}
              </Text>
            )}
            {errorCrons.length > 0 && (
              <Text style={{ margin: '0', fontSize: '13px', color: c.neutral[900] }}>
                Crony z błędami ({errorCrons.length}):{' '}
                {errorCrons.map((cron) => cron.name).join(', ')}
              </Text>
            )}
          </Callout>
        ) : (
          <Callout variant="success" label="Status cronów">
            Wszystkie crony działają poprawnie.
          </Callout>
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
          Status cronów
        </Text>

        <Row
          style={{
            backgroundColor: c.neutral[50],
            borderBottom: `2px solid ${c.neutral[200]}`,
            padding: '6px 0',
          }}
        >
          <Column style={{ width: '50%', padding: '4px 8px' }}>
            <Text
              style={{ margin: '0', fontSize: '12px', fontWeight: '700', color: c.neutral[500] }}
            >
              Cron
            </Text>
          </Column>
          <Column style={{ width: '30%', padding: '4px 8px' }}>
            <Text
              style={{ margin: '0', fontSize: '12px', fontWeight: '700', color: c.neutral[500] }}
            >
              Ostatnie uruchomienie
            </Text>
          </Column>
          <Column style={{ width: '20%', padding: '4px 8px' }}>
            <Text
              style={{ margin: '0', fontSize: '12px', fontWeight: '700', color: c.neutral[500] }}
            >
              Status
            </Text>
          </Column>
        </Row>

        {cronStatus.map((cron) => (
          <Row
            key={cron.name}
            style={{ borderBottom: `1px solid ${c.neutral[200]}`, padding: '4px 0' }}
          >
            <Column style={{ width: '50%', padding: '6px 8px' }}>
              <Text style={{ margin: '0', fontSize: '13px', color: c.neutral[900] }}>
                {cron.name}
              </Text>
            </Column>
            <Column style={{ width: '30%', padding: '6px 8px' }}>
              <Text style={{ margin: '0', fontSize: '12px', color: c.neutral[500] }}>
                {cron.lastRun ?? 'Nigdy'}
              </Text>
            </Column>
            <Column style={{ width: '20%', padding: '6px 8px' }}>
              {cron.status === 'OK' && (
                <Text style={{ margin: '0', fontSize: '12px', color: c.success[400] }}>✓ OK</Text>
              )}
              {cron.status === 'STUCK' && (
                <Text style={{ margin: '0', fontSize: '12px', color: c.danger[500] }}>
                  ✗ ZATKANE
                </Text>
              )}
              {cron.status === 'ERROR' && (
                <Text style={{ margin: '0', fontSize: '12px', color: c.warning[400] }}>⚠ BŁĄD</Text>
              )}
              {cron.lastError && (
                <Text style={{ margin: '2px 0 0 0', fontSize: '11px', color: c.danger[500] }}>
                  {cron.lastError}
                </Text>
              )}
            </Column>
          </Row>
        ))}

        <Divider />
        <Text
          style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: c.neutral[900],
          }}
        >
          Statystyki dobowe
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
          · <strong>{stats.activeEvents}</strong> aktywnych wydarzeń
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
          · <strong>{stats.totalUsers}</strong> łączna liczba użytkowników
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: c.neutral[900] }}>
          · <strong>{stats.newUsersToday}</strong> nowych użytkowników dzisiaj
        </Text>
        {logsCleaned > 0 && (
          <Text style={{ margin: '8px 0 0 0', fontSize: '12px', color: c.neutral[500] }}>
            Wyczyszczono {logsCleaned} starych logów cronów.
          </Text>
        )}
        <Text style={{ margin: '16px 0 0 0', fontSize: '12px', color: c.neutral[500] }}>
          Jeśli nie otrzymasz tego emaila jutro, oznacza to że cron monitor przestał działać.
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
