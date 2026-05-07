import { Button as EmailButton } from '@react-email/ui';
import React from 'react';
import { EMAIL_THEME } from '../theme';

const c = EMAIL_THEME.colors;

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'danger';
}

export function Button({ href, children, variant = 'primary' }: ButtonProps) {
  const bg = variant === 'danger' ? c.danger[500] : c.primary[500];
  return (
    <EmailButton
      href={href}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: bg,
        color: c.white,
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '600',
      }}
    >
      {children}
    </EmailButton>
  );
}
