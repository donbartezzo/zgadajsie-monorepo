import { Column } from '@react-email/column';
import { Row } from '@react-email/row';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import React from 'react';
import { Callout } from '../components/Callout';
import { Divider } from '../components/Divider';
import { TransactionalLayout } from '../layouts/TransactionalLayout';
import { APP_BRAND } from '../../../src/lib/constants/brand.constants';
import type { AdminDailyReportEmailProps } from '../types/templates';

export default function AdminDailyReportEmail({
  date = '2024-01-01',
  environment = 'local',
  cronStatus = [],
  stats = { activeEvents: 0, totalUsers: 0, newUsersToday: 0 },
  logsCleaned = 0,
}: AdminDailyReportEmailProps) {
  const stuckCrons = cronStatus.filter((c) => c.status === 'STUCK');
  const errorCrons = cronStatus.filter((c) => c.status === 'ERROR');
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
          style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1c1f23' }}
        >
          Raport dzienny – {date}
        </Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#656d78' }}>
          Środowisko: {environment}
        </Text>

        {hasIssues ? (
          <Callout variant="danger" label="Wykryto problemy z cronami!">
            {stuckCrons.length > 0 && (
              <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#1c1f23' }}>
                Zatkane crony ({stuckCrons.length}): {stuckCrons.map((c) => c.name).join(', ')}
              </Text>
            )}
            {errorCrons.length > 0 && (
              <Text style={{ margin: '0', fontSize: '13px', color: '#1c1f23' }}>
                Crony z błędami ({errorCrons.length}): {errorCrons.map((c) => c.name).join(', ')}
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
          style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#1c1f23' }}
        >
          Status cronów
        </Text>

        <Row
          style={{
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #dadce2',
            padding: '6px 0',
          }}
        >
          <Column style={{ width: '50%', padding: '4px 8px' }}>
            <Text style={{ margin: '0', fontSize: '12px', fontWeight: '700', color: '#656d78' }}>
              Cron
            </Text>
          </Column>
          <Column style={{ width: '30%', padding: '4px 8px' }}>
            <Text style={{ margin: '0', fontSize: '12px', fontWeight: '700', color: '#656d78' }}>
              Ostatnie uruchomienie
            </Text>
          </Column>
          <Column style={{ width: '20%', padding: '4px 8px' }}>
            <Text style={{ margin: '0', fontSize: '12px', fontWeight: '700', color: '#656d78' }}>
              Status
            </Text>
          </Column>
        </Row>

        {cronStatus.map((c) => (
          <Row key={c.name} style={{ borderBottom: '1px solid #dadce2', padding: '4px 0' }}>
            <Column style={{ width: '50%', padding: '6px 8px' }}>
              <Text style={{ margin: '0', fontSize: '13px', color: '#1c1f23' }}>{c.name}</Text>
            </Column>
            <Column style={{ width: '30%', padding: '6px 8px' }}>
              <Text style={{ margin: '0', fontSize: '12px', color: '#656d78' }}>
                {c.lastRun ?? 'Nigdy'}
              </Text>
            </Column>
            <Column style={{ width: '20%', padding: '6px 8px' }}>
              {c.status === 'OK' && (
                <Text style={{ margin: '0', fontSize: '12px', color: '#8cc152' }}>✓ OK</Text>
              )}
              {c.status === 'STUCK' && (
                <Text style={{ margin: '0', fontSize: '12px', color: '#da4453' }}>✗ ZATKANE</Text>
              )}
              {c.status === 'ERROR' && (
                <Text style={{ margin: '0', fontSize: '12px', color: '#e9573f' }}>⚠ BŁĄD</Text>
              )}
              {c.lastError && (
                <Text style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#da4453' }}>
                  {c.lastError}
                </Text>
              )}
            </Column>
          </Row>
        ))}

        <Divider />
        <Text
          style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#1c1f23' }}
        >
          Statystyki dobowe
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1c1f23' }}>
          · <strong>{stats.activeEvents}</strong> aktywnych wydarzeń
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1c1f23' }}>
          · <strong>{stats.totalUsers}</strong> łączna liczba użytkowników
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1c1f23' }}>
          · <strong>{stats.newUsersToday}</strong> nowych użytkowników dzisiaj
        </Text>
        {logsCleaned > 0 && (
          <Text style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#656d78' }}>
            Wyczyszczono {logsCleaned} starych logów cronów.
          </Text>
        )}
        <Text style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#656d78' }}>
          Jeśli nie otrzymasz tego emaila jutro, oznacza to że cron monitor przestał działać.
        </Text>
      </Section>
    </TransactionalLayout>
  );
}
