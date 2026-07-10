/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#070A14',
          900: '#0A0E1A',
          800: '#0F1526',
          700: '#161D33',
        },
        accent: {
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
        },
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(2, 6, 23, 0.45)',
        glow: '0 0 0 1px rgba(99,102,241,0.4), 0 0 24px rgba(99,102,241,0.25)',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% -10%, rgba(99,102,241,0.25), transparent 40%), radial-gradient(circle at 90% 10%, rgba(34,211,238,0.15), transparent 35%)',
      },
    },
  },
  plugins: [],
};
