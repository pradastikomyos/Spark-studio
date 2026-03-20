import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, './frontend'),
  envDir: path.resolve(__dirname, '.'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor';
          }

          if (id.includes('react-router')) {
            return 'router-vendor';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }

          if (id.includes('@supabase/supabase-js')) {
            return 'supabase-vendor';
          }

          if (id.includes('framer-motion')) {
            return 'motion-vendor';
          }

          if (id.includes('@dnd-kit') || id.includes('sortablejs')) {
            return 'dnd-vendor';
          }

          if (id.includes('html5-qrcode') || id.includes('qrcode') || id.includes('react-qr-code')) {
            return 'qr-vendor';
          }

          if (id.includes('i18next')) {
            return 'i18n-vendor';
          }

          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: path.resolve(__dirname, './frontend/src/test/setup.ts'),
    exclude: ['frontend lama/**', 'frontend baru/**', '**/node_modules/**', '**/dist/**'],
  }
})
