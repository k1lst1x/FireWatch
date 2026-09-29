import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API = process.env.VITE_API_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: API, changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/demo_images': { target: API, changeOrigin: true },
    },
  },
})
