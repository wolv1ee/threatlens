/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'btn-hover',
    'card-hover',
    'tab-hover',
    'nav-hover',
    'link-hover',
    'animate-fade-in-up',
    'animate-slide-in',
    'animate-pulse-glow',
    'stat-animate',
    'delay-1',
    'delay-2',
    'delay-3',
    'delay-4',
    'delay-5',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}