import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/upload': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/files': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/folders': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
})
