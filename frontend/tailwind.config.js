// ────────────────────────────────────────────────────────────
// SYSTEM KOLORÓW — 3-warstwowa architektura
//
// 1. FOUNDATION PALETTE (raw hex) — surowe kolory z szablonu sticky-mobile
// 2. SEMANTIC TOKENS (CSS vars w _tokens.scss) — source of truth
// 3. SEMANTIC MAPPING (poniżej) — Tailwind ← CSS vars
//
// W komponentach używaj TYLKO semantycznych klas (bg-primary-500, text-danger-400).
// Raw palettes (red, mint, blue...) dostępne dla dekoracji.
//
// Dokumentacja: docs/design-tokens.md
// Podgląd:      /dev/design-system (tylko dev mode)
// ────────────────────────────────────────────────────────────

// Helper do tworzenia palety z CSS vars (RGB space-separated → opacity support)
const withOpacity = (varName) => `rgb(var(${varName}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{html,ts}', './src/app/**/*.{html,ts}', './src/app/**/**/*.{html,ts}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
      },
    },
    extend: {
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
        // FOUNDATION PALETTE — raw hex z szablonu sticky-mobile
        // Używaj do dekoracji, kart kolorowych, akcentów.
        // ════════════════════════════════════════════════════════

        // ── Red ──
        red: {
          50: '#feecee',
          100: '#fcd4d9',
          200: '#f9b4bc',
          300: '#f28c96',
          400: '#ed5565',
          500: '#da4453',
          600: '#c0392b',
          700: '#a02020',
          800: '#7a1a24',
          900: '#501015',
        },

        // ── Orange ──
        orange: {
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#fc6e51',
          400: '#e9573f',
          500: '#d84315',
          600: '#bf360c',
          700: '#a02e0a',
          800: '#7f2508',
          900: '#5c1a05',
        },

        // ── Yellow ──
        yellow: {
          50: '#fffde7',
          100: '#fff9c4',
          200: '#fff59d',
          300: '#ffee58',
          400: '#ffce54',
          500: '#f6bb42',
          600: '#f9a825',
          700: '#f57f17',
          800: '#e65100',
          900: '#bf360c',
        },

        // ── Green ──
        green: {
          50: '#f0f9e8',
          100: '#dcf2cc',
          200: '#c5e1a5',
          300: '#a0d468',
          400: '#8cc152',
          500: '#6fa834',
          600: '#558b2f',
          700: '#437020',
          800: '#305214',
          900: '#1e350a',
        },

        // ── Mint ──
        mint: {
          50: '#e8faf5',
          100: '#d1f5ea',
          200: '#a7edd8',
          300: '#72dfbd',
          400: '#48cfad',
          500: '#37bc9b',
          600: '#26a386',
          700: '#1e826b',
          800: '#186856',
          900: '#124e40',
        },

        // ── Blue ──
        blue: {
          50: '#e8f3fe',
          100: '#c8e3fc',
          200: '#9dccf8',
          300: '#5d9cec',
          400: '#4a89dc',
          500: '#3070c4',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a3470',
          900: '#072240',
        },

        // ── Magenta ──
        magenta: {
          50: '#f3effc',
          100: '#e4daf8',
          200: '#d4c4f4',
          300: '#bfa8ee',
          400: '#ac92ec',
          500: '#967adc',
          600: '#7c5cc4',
          700: '#6244a8',
          800: '#4a3380',
          900: '#322258',
        },

        // ── Pink ──
        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#f9c4de',
          300: '#f49ac2',
          400: '#ec87c0',
          500: '#d770ad',
          600: '#c2549a',
          700: '#a33e80',
          800: '#832f66',
          900: '#63234d',
        },

        // ── Brown ──
        brown: {
          50: '#f5f0eb',
          100: '#e8ddd3',
          200: '#d4c4b4',
          300: '#baa286',
          400: '#aa8e69',
          500: '#8d6e4c',
          600: '#795548',
          700: '#5d4037',
          800: '#4a332c',
          900: '#3e2723',
        },

        // ── Dark (gray scale) ──
        dark: {
          50: '#f8f9fa',
          100: '#eaecf0',
          200: '#dadce2',
          300: '#bcc0ca',
          400: '#9ea2ae',
          500: '#656d78',
          600: '#434a54',
          700: '#343941',
          800: '#262a30',
          900: '#1c1f23',
          950: '#121417',
        },

        // ════════════════════════════════════════════════════════
        // SEMANTIC PALETTE — mapowanie na CSS vars (_tokens.scss)
        // To jest główna paleta do użycia w komponentach!
        // ════════════════════════════════════════════════════════

        // ── Primary (mint) — Brand, CTA, przyciski, linki ──
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

        // ── Neutral (dark/gray) — Tła, tekst, bordery ──
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

        // ── Success (green) — Pozytywne statusy ──
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

        // ── Warning (orange) — Ostrzeżenia ──
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

        // ── Danger (red) — Błędy, destrukcyjne akcje ──
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

        // ── Info (blue) — Informacje, focus ring ──
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
