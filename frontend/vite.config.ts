import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react'
            }

            if (id.includes('kuroshiro') || id.includes('kuromoji') || id.includes('wanakana')) {
              return 'japanese'
            }

            if (id.includes('motion')) {
              return 'motion'
            }

            return 'vendor'
          }
        }
      },
    },
  },
})
