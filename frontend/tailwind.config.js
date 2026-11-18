/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060b',
          900: '#080a12',
          850: '#0b0e18',
          800: '#0f1320',
          700: '#151a2b',
          600: '#1d2438',
          500: '#2a3350',
        },
        violet: { 400: '#a78bfa', 500: '#7c5cff', 600: '#6437ff' },
        cyan: { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4' },
        lime: { 300: '#bef264', 400: '#a3e635' },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.75rem' },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,.25), 0 18px 60px -20px rgba(124,92,255,.55)',
        lift: '0 24px 60px -30px rgba(0,0,0,.9)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pulseRing: {
          '0%': { transform: 'scale(.85)', opacity: '.7' },
          '80%,100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 28s linear infinite',
        pulseRing: 'pulseRing 2.4s cubic-bezier(.24,.6,.35,1) infinite',
      },
    },
  },
  plugins: [],
};
