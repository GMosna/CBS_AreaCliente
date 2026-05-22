import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-bebas)', '"Bebas Neue"', 'sans-serif'],
        sans:    ['var(--font-dm)',    '"DM Sans"',    'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up':  'fadeUp  0.4s ease both',
        'fade-in':  'fadeIn  0.3s ease both',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.32,0.72,0,1) both',
        'scale-in': 'scaleIn 0.2s ease both',
        'shimmer':  'shimmer 1.5s ease infinite',
      },
    },
  },
} satisfies Config;
