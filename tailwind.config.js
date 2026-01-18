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
      zIndex: {
        auto: 'auto',
        base: '0',
        'danmaku-round2': '0',
        'danmaku-round1': '10',
        'end-card': '90', // New
        'danmaku-layer': '100', // New
        'ui-base': '200', // Was 10
        touch: '200', // Was 20
        resizer: '205', // Was 20
        controls: '210', // Was 30
        panel: '300', // Was 40
        menu: '310', // Was 40
        floating: '400', // Was 50
        'popup-stack': '450', // New
        'context-backdrop': '500', // Was 90
        context: '510', // Was 91
        'modal-backdrop': '600',
        modal: '610', // Was 100
        'high-priority': '700', // New high priority
        'image-viewer': '9000',
        'color-picker': '9100', // Was 9999
        'fullscreen-modal': '9200', // Was 9999
        'tutorial-highlight': '9500', // Was 10000
        'confirm-modal': '9999', // Was 10000
        max: '10000',
      },
    },
  },
  plugins: [],
};
