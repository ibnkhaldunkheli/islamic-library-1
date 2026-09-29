import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F8FB',
        ink: '#102033',
        navy: '#0B1F3A',
        blue: { 50: '#EFF6FF', 100: '#DBEAFE', 300: '#93C5FD', 500: '#3B82F6', 600: '#165DBE', 700: '#124A98', 900: '#0B1F3A' },
        line: '#DBE4EF',
        gold: { 400: '#D4A72C', 500: '#B88B18' },
      },
      fontFamily: { sans: ['Tajawal', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '12px' },
      boxShadow: { soft: '0 10px 30px rgba(11,31,58,.08)' },
    },
  },
  plugins: [],
};
export default config;
