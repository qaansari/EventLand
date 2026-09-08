import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    https: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        headers: { 'ngrok-skip-browser-warning': '1' }
      },
      '/hubs': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        ws: true,
        changeOrigin: true,
        secure: true,
        headers: { 'ngrok-skip-browser-warning': '1' }
      },
      '/uploads': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        headers: { 'ngrok-skip-browser-warning': '1' }
      },
      '/assets': {
        target: 'https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        headers: { 'ngrok-skip-browser-warning': '1' }
      }
    }
  }
})
