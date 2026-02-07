module.exports = {
  content: [
    './src/**/*.{html,ts}',
    './src/app/**/*.{html,ts}',
    './src/app/**/**/*.{html,ts}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        // md: '768px',
        // lg: '1024px',
        // xl: '1200px',
      },
    },
    extend: {},
  },
  plugins: [],
};
