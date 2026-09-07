import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F5',
        ink: '#171A17',
        emerald: {
          50: '#EAF3EE',
          100: '#CFE4D8',
          400: '#2E7D52',
          600: '#0F5132',
          700: '#0B3D26',
          900: '#082B1A',
        },
        gold: {
          400: '#C9A227',
          500: '#B08B1D',
        },
        line: '#E4E1D8',
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
export default config;
