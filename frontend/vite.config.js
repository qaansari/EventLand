import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: false
      },
      '/hubs': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: false
      },
      '/assets': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
