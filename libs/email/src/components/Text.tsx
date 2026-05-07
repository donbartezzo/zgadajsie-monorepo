import { Text as EmailText } from '@react-email/components';
import React from 'react';
import { EMAIL_THEME } from '../theme';

const c = EMAIL_THEME.colors;

interface TextProps {
  children: React.ReactNode;
  variant?: 'body' | 'muted' | 'small';
  style?: React.CSSProperties;
}

const variantStyles: Record<string, React.CSSProperties> = {
  body: { fontSize: '14px', color: c.neutral[900], lineHeight: '1.6', margin: '0 0 12px 0' },
  muted: { fontSize: '13px', color: c.neutral[500], lineHeight: '1.5', margin: '0 0 8px 0' },
  small: { fontSize: '12px', color: c.neutral[500], lineHeight: '1.4', margin: '0 0 4px 0' },
};

export function Text({ children, variant = 'body', style }: TextProps) {
  return <EmailText style={{ ...variantStyles[variant], ...style }}>{children}</EmailText>;
}
