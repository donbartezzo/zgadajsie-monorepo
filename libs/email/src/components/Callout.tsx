import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import React from 'react';

type CalloutVariant = 'info' | 'warning' | 'danger' | 'success';

interface CalloutProps {
  children: React.ReactNode;
  variant?: CalloutVariant;
  label?: string;
}

const variantConfig: Record<CalloutVariant, { bg: string; border: string; labelColor: string }> =
  {
    info: { bg: '#e8faf5', border: '#37bc9b', labelColor: '#26a386' },
    warning: { bg: '#fef9c3', border: '#fde68a', labelColor: '#92400e' },
    danger: { bg: '#fef2f2', border: '#fecaca', labelColor: '#da4453' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', labelColor: '#8cc152' },
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
      <Text style={{ margin: '0', fontSize: '14px', color: '#1c1f23' }}>{children}</Text>
    </Section>
  );
}
