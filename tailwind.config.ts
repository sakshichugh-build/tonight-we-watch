import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F0E0E', // primary text / black elements
        surface: '#F6F6F5', // light card / input fill
        ash: '#4B4A4B', // muted text
        line: '#E6E5E4', // hairline borders
        brand: {
          DEFAULT: '#FE2E4B', // primary red accent
          soft: '#FFE6EA', // red tint fill
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
