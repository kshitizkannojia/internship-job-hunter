/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
          400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
          800: '#6b21a8', 900: '#581c87',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'aurora-drift': 'aurora-drift 20s ease-in-out infinite',
        'aurora-drift-2': 'aurora-drift-2 25s ease-in-out infinite',
        'aurora-pulse': 'aurora-pulse 8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'aurora-drift': {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '25%': { transform: 'translate(60px,30px) scale(1.05)' },
          '50%': { transform: 'translate(-20px,60px) scale(0.97)' },
          '75%': { transform: 'translate(-50px,-20px) scale(1.03)' },
          '100%': { transform: 'translate(0,0) scale(1)' },
        },
        'aurora-drift-2': {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(-40px,-30px) scale(1.06)' },
          '66%': { transform: 'translate(30px,40px) scale(0.95)' },
          '100%': { transform: 'translate(0,0) scale(1)' },
        },
        'aurora-pulse': {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 8px hsla(270,90%,55%,0.15)' },
          '50%': { boxShadow: '0 0 24px hsla(270,90%,55%,0.35)' },
        },
      },
    },
  },
  plugins: [],
}
