import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api and /ws to the cloud backend so the app uses same-origin paths.
//
// `base` matters for GitHub Pages: a project site is served from
// /<repo>/ rather than the root, so asset URLs need that prefix. Set it per
// build mode via VITE_BASE (see .env.pages); everything else builds at root.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: {
      port: 5273,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:8787',
        '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
      },
    },
  };
});
