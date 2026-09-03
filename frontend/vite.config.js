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
        //target: 'https://localhost:7257',
        target: ' https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: false
      },
      '/hubs': {
        //target: 'https://localhost:7257',
        target: ' https://celiac-briley-commandingly.ngrok-free.dev',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        // target: 'https://localhost:7257',
        target: ' https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: false
      },
      '/assets': {
        //target: 'https://localhost:7257',
        target: ' https://celiac-briley-commandingly.ngrok-free.dev',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
