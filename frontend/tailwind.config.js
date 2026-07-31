/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        market: {
          50: 'var(--color-market-50)',
          100: 'var(--color-market-100)',
          200: 'var(--color-market-200)',
          300: 'var(--color-market-300)',
          400: 'var(--color-market-400)',
          500: 'var(--color-market-500)',
          600: 'var(--color-market-600)',
          700: 'var(--color-market-700)',
          800: 'var(--color-market-800)',
          900: 'var(--color-market-900)',
          950: 'var(--color-market-950)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'market-card': '0 2px 8px -2px rgba(22, 101, 52, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
        'market-hover': '0 8px 24px -4px rgba(22, 101, 52, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
