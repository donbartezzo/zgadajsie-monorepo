// ────────────────────────────────────────────────────────────
// SYSTEM KOLORÓW - 4-warstwowa architektura
//
// 0. FOUNDATION JSON (single source of truth): libs/src/lib/constants/color-palette.json
// 1. FOUNDATION PALETTE (Tailwind raw): spread z color-palette.json (poniżej)
// 2. SEMANTIC TOKENS (CSS vars w _tokens.scss) — auto-generated przez scripts/generate-color-tokens.mjs
// 3. SEMANTIC MAPPING (poniżej) — Tailwind ← CSS vars
//
// W komponentach używaj TYLKO semantycznych klas (bg-primary-500, text-danger-400).
// Raw palettes (red, mint, blue...) dostępne dla dekoracji.
//
// Dokumentacja: docs/design-tokens.md
// Podgląd:      /dev/design-system (tylko dev mode)
// ────────────────────────────────────────────────────────────

// Pure JSON require — bez transpilera, bez runtime overhead
const COLOR_PALETTE = require('../libs/src/lib/constants/color-palette.json');

// Helper do tworzenia palety z CSS vars (RGB space-separated → opacity support)
const withOpacity = (varName) => `rgb(var(${varName}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{html,ts}', './src/app/**/*.{html,ts}', './src/app/**/**/*.{html,ts}'],
  theme: {
    extend: {
      screens: {
        '3xs': '280px',
        '2xs': '320px',
        xs: '400px',
      },
      spacing: {
        18: '4.5rem', // 72px - for xl avatar size
      },
      maxWidth: {
        app: 'var(--app-max-width)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
      colors: {
        // ════════════════════════════════════════════════════════
        // FOUNDATION PALETTE - raw hex z libs/src/lib/constants/color-palette.ts
        // Używaj do dekoracji, kart kolorowych, akcentów.
        // ════════════════════════════════════════════════════════
        ...COLOR_PALETTE,

        // ════════════════════════════════════════════════════════
        // SEMANTIC PALETTE - mapowanie na CSS vars (_tokens.scss)
        // To jest główna paleta do użycia w komponentach!
        // ════════════════════════════════════════════════════════

        // ── Primary (mint) - Brand, CTA, przyciski, linki ──
        primary: {
          50: withOpacity('--color-primary-50'),
          100: withOpacity('--color-primary-100'),
          200: withOpacity('--color-primary-200'),
          300: withOpacity('--color-primary-300'),
          400: withOpacity('--color-primary-400'),
          500: withOpacity('--color-primary-500'),
          600: withOpacity('--color-primary-600'),
          700: withOpacity('--color-primary-700'),
          800: withOpacity('--color-primary-800'),
          900: withOpacity('--color-primary-900'),
        },

        // ── Neutral (dark/gray) - Tła, tekst, bordery ──
        neutral: {
          50: withOpacity('--color-neutral-50'),
          100: withOpacity('--color-neutral-100'),
          200: withOpacity('--color-neutral-200'),
          300: withOpacity('--color-neutral-300'),
          400: withOpacity('--color-neutral-400'),
          500: withOpacity('--color-neutral-500'),
          600: withOpacity('--color-neutral-600'),
          700: withOpacity('--color-neutral-700'),
          800: withOpacity('--color-neutral-800'),
          900: withOpacity('--color-neutral-900'),
          950: withOpacity('--color-neutral-950'),
        },

        // ── Success (green) - Pozytywne statusy ──
        success: {
          50: withOpacity('--color-success-50'),
          100: withOpacity('--color-success-100'),
          200: withOpacity('--color-success-200'),
          300: withOpacity('--color-success-300'),
          400: withOpacity('--color-success-400'),
          500: withOpacity('--color-success-500'),
          600: withOpacity('--color-success-600'),
          700: withOpacity('--color-success-700'),
          800: withOpacity('--color-success-800'),
          900: withOpacity('--color-success-900'),
        },

        // ── Warning (orange) - Ostrzeżenia ──
        warning: {
          50: withOpacity('--color-warning-50'),
          100: withOpacity('--color-warning-100'),
          200: withOpacity('--color-warning-200'),
          300: withOpacity('--color-warning-300'),
          400: withOpacity('--color-warning-400'),
          500: withOpacity('--color-warning-500'),
          600: withOpacity('--color-warning-600'),
          700: withOpacity('--color-warning-700'),
          800: withOpacity('--color-warning-800'),
          900: withOpacity('--color-warning-900'),
        },

        // ── Danger (red) - Błędy, destrukcyjne akcje ──
        danger: {
          50: withOpacity('--color-danger-50'),
          100: withOpacity('--color-danger-100'),
          200: withOpacity('--color-danger-200'),
          300: withOpacity('--color-danger-300'),
          400: withOpacity('--color-danger-400'),
          500: withOpacity('--color-danger-500'),
          600: withOpacity('--color-danger-600'),
          700: withOpacity('--color-danger-700'),
          800: withOpacity('--color-danger-800'),
          900: withOpacity('--color-danger-900'),
        },

        // ── Info (blue) - Informacje, focus ring ──
        info: {
          50: withOpacity('--color-info-50'),
          100: withOpacity('--color-info-100'),
          200: withOpacity('--color-info-200'),
          300: withOpacity('--color-info-300'),
          400: withOpacity('--color-info-400'),
          500: withOpacity('--color-info-500'),
          600: withOpacity('--color-info-600'),
          700: withOpacity('--color-info-700'),
          800: withOpacity('--color-info-800'),
          900: withOpacity('--color-info-900'),
        },
      },
    },
  },
  plugins: [],
};
