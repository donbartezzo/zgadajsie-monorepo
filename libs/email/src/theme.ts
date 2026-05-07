import { COLOR_PALETTE } from '../../src/lib/constants/color-palette';

// Semantic email theme — maps design-system palette names to color shades.
// Usage: const c = EMAIL_THEME.colors;  → c.primary[500], c.neutral[900], c.white
export const EMAIL_THEME = {
  colors: {
    primary: COLOR_PALETTE.mint,
    neutral: COLOR_PALETTE.dark,
    success: COLOR_PALETTE.green,
    warning: COLOR_PALETTE.orange,
    danger: COLOR_PALETTE.red,
    info: COLOR_PALETTE.blue,
    white: '#ffffff',
  },
} as const;

export type EmailThemeColors = typeof EMAIL_THEME.colors;
