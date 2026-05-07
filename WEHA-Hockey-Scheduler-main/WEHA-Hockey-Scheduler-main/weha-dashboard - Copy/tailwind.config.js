import { defineConfig } from 'tailwindcss'

export default defineConfig({
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#0B1F3A', // dark blue
        secondary: '#A4161A', // red
      },
    },
  },
})