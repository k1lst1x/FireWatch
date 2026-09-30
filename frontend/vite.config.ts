import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API = process.env.VITE_API_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  // GitHub Pages serves this project from /FireWatch/. Local development keeps
  // the root path unless VITE_BASE_PATH is explicitly supplied.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: API, changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/demo_images': { target: API, changeOrigin: true },
    },
  },
})
