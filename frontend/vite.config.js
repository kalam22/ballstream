import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',

  build: {
    // Target modern browsers — smaller output, no legacy polyfills
    target: 'es2020',
    // Warn when a chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split vendor libraries into separate cacheable chunks
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/sweetalert2')) {
            return 'ui-vendor'
          }
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify with oxc (Vite 8 default, no esbuild needed)
    minify: 'oxc',
    // Generate source maps only in development
    sourcemap: false,
  },

  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'ball-stream.kana.my.id',
      'localhost',
      '.kana.my.id',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
