import { Hr } from '@react-email/components';
import React from 'react';
import { EMAIL_THEME } from '../theme';

const c = EMAIL_THEME.colors;

export function Divider() {
  return <Hr style={{ borderTop: `1px solid ${c.neutral[200]}`, margin: '16px 0' }} />;
}
