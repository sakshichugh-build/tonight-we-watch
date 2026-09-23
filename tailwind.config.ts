import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F0E0E', // page background
        surface: '#161316', // cards / inputs
        ash: '#4B4A4B', // borders / muted
        brand: {
          DEFAULT: '#FE2E4B', // primary red
          soft: '#FE2E4B',
        },
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
