/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        danmaku: {
          '0%': { left: '100%', transform: 'translateX(0)' },
          '100%': { left: '0', transform: 'translateX(-100%)' },
        },
      },
      animation: {
        danmaku: 'danmaku linear forwards',
      },
    },
  },
  plugins: [],
};
