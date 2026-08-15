/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Cairo', 'sans-serif'],
      },
      colors: {
        // هوية جامعة برج العرب التكنولوجية
        brand: {
          teal: {
            50: '#eefafa',
            100: '#d4f2f2',
            200: '#a9e6e6',
            300: '#73d3d3',
            400: '#40b0b0',
            500: '#2e9b9b',
            600: '#268080',
            700: '#22696a',
            800: '#215556',
            900: '#1f4849',
          },
          olive: {
            300: '#b7d97a',
            400: '#9cc94f',
            500: '#8cbf3f',
            600: '#7ba83f',
            700: '#5f8531',
          },
          ink: '#303030',
        },
      },
      boxShadow: {
        'brand': '0 10px 30px -10px rgba(46, 155, 155, 0.35)',
        'brand-lg': '0 20px 50px -12px rgba(46, 155, 155, 0.45)',
        'soft': '0 8px 30px -8px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-slow': 'float-slow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
