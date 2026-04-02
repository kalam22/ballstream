import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Serve from root
  base: '/',
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    allowedHosts: [
      'ball-stream.kana.my.id',
      'localhost',
      '.kana.my.id' // Allow all subdomains
    ],
    proxy: {
      // Only proxy API requests to backend
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
