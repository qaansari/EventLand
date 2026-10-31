import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables across process.cwd() and import.meta.dirname
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ''),
    ...loadEnv(mode, import.meta.dirname, '')
  };

  // Prefer env-configured backend; fall back to localhost for local development.
  let backendTarget = (env.VITE_BACKEND_URL && env.VITE_BACKEND_URL.trim())
    ? env.VITE_BACKEND_URL.trim()
    : 'http://localhost:4257';

  // Automatically upgrade ngrok or tunnel URLs to HTTPS to prevent redirect loops and warnings
  if ((backendTarget.includes('ngrok') || backendTarget.includes('localtunnel')) && backendTarget.startsWith('http://')) {
    backendTarget = backendTarget.replace('http://', 'https://');
  }

  // Common proxy configuration helper that suppresses "View Site Warning" / interstitial pages
  // on ngrok, localtunnel, and other reverse tunnels for both API calls and static images.
  const createProxyRoute = (target, isWs = false) => ({
    target,
    changeOrigin: true,
    secure: false,
    ws: isWs,
    followRedirects: true,
    headers: {
      'ngrok-skip-browser-warning': 'true',
      'bypass-tunnel-reminder': 'true',
      'User-Agent': 'EventLand-App/1.0'
    },
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        // Enforce anti-warning headers on outgoing HTTP request
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
        proxyReq.setHeader('bypass-tunnel-reminder', 'true');
        // Non-browser User-Agent tells ngrok this is an automated / API client,
        // completely bypassing the HTML "View Site / Visit Site" warning page.
        proxyReq.setHeader('User-Agent', 'EventLand-App/1.0');
      });

      if (isWs) {
        proxy.on('proxyReqWs', (proxyReq) => {
          proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
          proxyReq.setHeader('bypass-tunnel-reminder', 'true');
          proxyReq.setHeader('User-Agent', 'EventLand-App/1.0');
        });
      }

      proxy.on('error', (err, req) => {
        console.warn(`[Vite Proxy] Error connecting to backend (${req.url}):`, err.message);
      });
    }
  });

  const proxyConfig = {
    '/api': createProxyRoute(backendTarget),
    '/hubs': createProxyRoute(backendTarget, true),
    '/assets': createProxyRoute(backendTarget),
    '/uploads': createProxyRoute(backendTarget),
    '/images': createProxyRoute(backendTarget),
    '/qr_codes': createProxyRoute(backendTarget),
    '/slips': createProxyRoute(backendTarget)
  };

  return {
    plugins: [react(), basicSsl()],
    server: {
      port: 5174,
      host: true, // Listen on all network interfaces (0.0.0.0) so tunnels can access Vite dev server
      allowedHosts: true, // Overcome Vite's "Blocked request: unauthorized host" warning for tunnels
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      },
      proxy: proxyConfig
    },
    preview: {
      port: 5174,
      host: true,
      allowedHosts: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      },
      proxy: proxyConfig
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
              if (id.includes('qrcode')) {
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
});
