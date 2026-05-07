import { Section, Text } from '@react-email/components';
import React from 'react';
import { EMAIL_THEME } from '../theme';

const c = EMAIL_THEME.colors;

type CalloutVariant = 'info' | 'warning' | 'danger' | 'success';

interface CalloutProps {
  children: React.ReactNode;
  variant?: CalloutVariant;
  label?: string;
}

const variantConfig: Record<CalloutVariant, { bg: string; border: string; labelColor: string }> = {
  info: { bg: c.info[50], border: c.info[200], labelColor: c.info[600] },
  warning: { bg: c.warning[50], border: c.warning[200], labelColor: c.warning[600] },
  danger: { bg: c.danger[50], border: c.danger[200], labelColor: c.danger[500] },
  success: { bg: c.success[50], border: c.success[200], labelColor: c.success[600] },
};

export function Callout({ children, variant = 'info', label }: CalloutProps) {
  const { bg, border, labelColor } = variantConfig[variant];
  return (
    <Section
      style={{
        backgroundColor: bg,
        borderLeft: `4px solid ${border}`,
        borderRadius: '4px',
        padding: '12px 16px',
        margin: '16px 0',
      }}
    >
      {label && (
        <Text
          style={{
            margin: '0 0 4px 0',
            fontSize: '12px',
            color: labelColor,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      )}
      <Text style={{ margin: '0', fontSize: '14px', color: c.neutral[900] }}>{children}</Text>
    </Section>
  );
}
