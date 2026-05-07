import { Text as EmailText } from '@react-email/text';
import React from 'react';

interface TextProps {
  children: React.ReactNode;
  variant?: 'body' | 'muted' | 'small';
  style?: React.CSSProperties;
}

const variantStyles: Record<string, React.CSSProperties> = {
  body: { fontSize: '14px', color: '#1c1f23', lineHeight: '1.6', margin: '0 0 12px 0' },
  muted: { fontSize: '13px', color: '#656d78', lineHeight: '1.5', margin: '0 0 8px 0' },
  small: { fontSize: '12px', color: '#656d78', lineHeight: '1.4', margin: '0 0 4px 0' },
};

export function Text({ children, variant = 'body', style }: TextProps) {
  return <EmailText style={{ ...variantStyles[variant], ...style }}>{children}</EmailText>;
}
