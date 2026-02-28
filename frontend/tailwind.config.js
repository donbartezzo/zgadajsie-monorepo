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
    },
  },
  plugins: [],
};
