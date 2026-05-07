import { Column, Row, Text } from '@react-email/ui';
import React from 'react';
import { EMAIL_THEME } from '../theme';
import { Button } from './Button';

const c = EMAIL_THEME.colors;

interface EventRowProps {
  title: string;
  date?: string;
  enrollmentCount?: number;
  actionHref?: string;
  actionLabel?: string;
}

export function EventRow({ title, date, enrollmentCount, actionHref, actionLabel }: EventRowProps) {
  return (
    <Row
      style={{
        borderBottom: `1px solid ${c.neutral[200]}`,
        padding: '8px 0',
      }}
    >
      <Column>
        <Text style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: c.neutral[900] }}>
          {title}
        </Text>
        {date && (
          <Text style={{ margin: '2px 0 0 0', fontSize: '12px', color: c.neutral[500] }}>
            {date}
          </Text>
        )}
        {enrollmentCount !== undefined && (
          <Text style={{ margin: '2px 0 0 0', fontSize: '12px', color: c.neutral[500] }}>
            Uczestników: {enrollmentCount}
          </Text>
        )}
      </Column>
      {actionHref && actionLabel && (
        <Column style={{ textAlign: 'right', verticalAlign: 'middle' }}>
          <Button href={actionHref}>{actionLabel}</Button>
        </Column>
      )}
    </Row>
  );
}
