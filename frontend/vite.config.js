import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5062',
        changeOrigin: true,
        secure: false
      },
      '/hubs': {
        target: 'http://localhost:5062',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5062',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
