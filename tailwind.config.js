/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "#C04AE2",
        secondary: "#F16389",
        dark: "#090A40",
        accent: "#03D99D",
        warning: "#F28C35",
        'calm-green': {
          light: '#E7F6EC',
          DEFAULT: '#4CAF50',
          dark: '#388E3C'
        },
        'action': {
          'buy': {
            DEFAULT: '#4CAF50',
            light: '#E8F5E9',
            hover: '#43A047'
          },
          'sell': {
            DEFAULT: '#EF4444',
            light: '#FEE2E2',
            hover: '#DC2626'
          }
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
