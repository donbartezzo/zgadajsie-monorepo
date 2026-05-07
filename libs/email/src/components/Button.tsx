import { Button as EmailButton } from '@react-email/button';
import React from 'react';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'danger';
}

export function Button({ href, children, variant = 'primary' }: ButtonProps) {
  const bg = variant === 'danger' ? '#da4453' : '#37bc9b';
  return (
    <EmailButton
      href={href}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: bg,
        color: '#fff',
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
