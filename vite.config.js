import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Electron loads dist via file:// and needs relative asset paths ('./').
// The GitHub Pages build is served under /<repo>/ and needs an absolute base.
// Select with BUILD_TARGET=web (see "build:web" script); override with VITE_BASE.
const isWeb = process.env.BUILD_TARGET === 'web';
const base = process.env.VITE_BASE || (isWeb ? '/PromptForge/' : './');

export default defineConfig({
  root: fileURLToPath(new URL('./renderer', import.meta.url)),
  base,
  plugins: [react()],
  define: {
    // Baked at build time; falls back to '' so the user can paste a URL in Settings.
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL || ''),
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/renderer', import.meta.url)),
    emptyOutDir: true,
  },
});
