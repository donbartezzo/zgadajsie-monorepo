module.exports = {
  content: ['./src/**/*.{html,ts}', './src/app/**/*.{html,ts}', './src/app/**/**/*.{html,ts}'],
  darkMode: 'class',
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
      colors: {
        // ── Semantic design tokens (auto-switch light/dark via CSS vars) ──
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        foreground: 'var(--color-foreground)',
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        border: 'var(--color-border)',
        ring: 'var(--color-ring)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          foreground: 'var(--color-primary-foreground)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          foreground: 'var(--color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          foreground: 'var(--color-warning-foreground)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          foreground: 'var(--color-danger-foreground)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          foreground: 'var(--color-info-foreground)',
        },

        // ── Static brand color (highlight) — nie zmienia się z theme ──
        highlight: {
          DEFAULT: '#DA4453',
          light: '#ED5565',
          dark: '#C0392B',
          50: '#FDF2F2',
          100: '#FCE4E4',
          200: '#F9CECE',
          500: '#ED5565',
          600: '#DA4453',
          700: '#C0392B',
        },
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
      ringColor: {
        DEFAULT: 'var(--color-ring)',
      },
    },
  },
  plugins: [],
};
