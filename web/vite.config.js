import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api and /ws to the cloud backend so the app uses same-origin paths.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
    },
  },
});
