import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The SPA is mounted under /app/ in production (Caddy serves the landing at
  // the apex). Vite needs to prefix generated asset URLs so dev and prod use
  // the same paths — open http://localhost:5173/app/ in dev.
  base: '/app/',
  server: {
    // Proxy /api/* to the Fastify container (docker-compose.dev.yml exposes
    // it on 127.0.0.1:3000). Mirrors Caddy's role in prod so frontend code
    // only ever calls same-origin /api/... — no CORS, cookies just work.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
