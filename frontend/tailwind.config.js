// ────────────────────────────────────────────────────────────
// CENTRALNA PALETA KOLORÓW — Base Palette / Design Tokens
//
// Ten plik jest JEDYNYM źródłem prawdy kolorystycznej w projekcie.
// Każdy kolor w szablonach MUSI pochodzić z tej palety.
//
// Dokumentacja: docs/design-tokens.md
// Podgląd:      /dev/design-system (tylko dev mode)
// ────────────────────────────────────────────────────────────

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
        // ── Brand / Primary (highlight → primary) ──
        primary: {
          50: '#fdf2f2',
          100: '#fce4e4',
          200: '#f9cece',
          300: '#f2a5a5',
          400: '#ed5565',
          500: '#da4453',
          600: '#c0392b',
          700: '#a02020',
          800: '#7a1a24',
          900: '#501015',
        },

        // ── Neutral (tła, tekst, bordery) ──
        neutral: {
          50: '#fafafa',
          100: '#eaeaef',
          200: '#e0e0e5',
          300: '#c8c8d0',
          400: '#9e9ea8',
          500: '#6c6c6c',
          600: '#555555',
          700: '#3f3f3f',
          800: '#2a2a2a',
          900: '#1f1f1f',
          950: '#0f0f0f',
        },

        // ── Success (zielony) ──
        success: {
          50: '#e8f5e0',
          100: '#d4edcc',
          200: '#c5e1a5',
          300: '#a0d468',
          400: '#8cc152',
          500: '#6fa834',
          600: '#558b2f',
          700: '#437020',
          800: '#305214',
          900: '#1e350a',
        },

        // ── Warning (pomarańczowy) ──
        warning: {
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

        // ── Danger (czerwony — brand-adjacent) ──
        danger: {
          50: '#fce4ec',
          100: '#f8bbd0',
          200: '#ef9a9a',
          300: '#ed5565',
          400: '#da4453',
          500: '#c62828',
          600: '#b71c1c',
          700: '#8e0000',
          800: '#6d0000',
          900: '#4a0000',
        },

        // ── Info (niebieski) ──
        info: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#5d9cec',
          400: '#4a89dc',
          500: '#3070c4',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a3470',
          900: '#072240',
        },

        // ── Teal (dekoracyjny) ──
        teal: {
          50: '#e0f2f1',
          100: '#b2dfdb',
          200: '#80cbc4',
          300: '#a0cecb',
          400: '#7db1b1',
          500: '#5d9e9e',
          600: '#00695c',
          700: '#004d40',
          800: '#003833',
          900: '#002420',
        },

        // ── Brown (dekoracyjny) ──
        brown: {
          50: '#efebe9',
          100: '#d7ccc8',
          200: '#bcaaa4',
          300: '#baa286',
          400: '#aa8e69',
          500: '#8d6e4c',
          600: '#795548',
          700: '#5d4037',
          800: '#4a332c',
          900: '#3e2723',
        },
      },
    },
  },
  plugins: [],
};
