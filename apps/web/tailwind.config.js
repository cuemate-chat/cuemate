import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
    container: {
      center: true,
      padding: '16px',
      screens: {
        '2xl': '1480px',
      },
    },
  },
  plugins: [typography],
};


