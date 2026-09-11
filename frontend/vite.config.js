import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env.local so VITE_BACKEND_URL is available at config time
  const env = loadEnv(mode, process.cwd(), '');

  // Prefer the env-configured backend; fall back to the current ngrok tunnel for local dev.
  // To switch tunnels, update VITE_BACKEND_URL in .env.local — no code change required.
  const backendTarget = (env.VITE_BACKEND_URL && !env.VITE_BACKEND_URL.includes('localhost'))
    ? env.VITE_BACKEND_URL
    : 'https://celiac-briley-commandingly.ngrok-free.dev';

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': '1' }
        },
        '/hubs': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': '1' }
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': '1' }
        },
        '/assets': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': '1' }
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@microsoft/signalr')) {
                return 'vendor-signalr';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('html2pdf')) {
                return 'vendor-pdf';
              }
              if (id.includes('dompurify') || id.includes('qrcode')) {
                return 'vendor-utils';
              }
              return 'vendor';
            }
          }
        }
      },
      chunkSizeWarningLimit: 600
    }
  };
})
