const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  darkMode: false,
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        slate: colors.coolGray,
        emerald: colors.emerald,
        rose: colors.rose,
        amber: colors.amber,
        indigo: colors.indigo,
        gray: colors.trueGray,
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
