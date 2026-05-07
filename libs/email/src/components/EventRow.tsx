import { Column } from '@react-email/column';
import { Row } from '@react-email/row';
import { Text } from '@react-email/text';
import React from 'react';
import { Button } from './Button';

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
        borderBottom: '1px solid #dadce2',
        padding: '8px 0',
      }}
    >
      <Column>
        <Text style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#1c1f23' }}>
          {title}
        </Text>
        {date && (
          <Text style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#656d78' }}>{date}</Text>
        )}
        {enrollmentCount !== undefined && (
          <Text style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#656d78' }}>
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
