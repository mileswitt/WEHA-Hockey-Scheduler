
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  preview: {
    allowedHosts: ['weha-hockey-scheduler-c9h3.onrender.com']
  }
})