import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the same build works on Cloudflare Pages and itch.io.
  base: './',
  build: {
    target: 'es2022',
    // Keep atlases as separate files (no data: URIs) for caching and a strict CSP later.
    assetsInlineLimit: 0,
    // Phaser alone is ~1.2 MB minified; the NFR budget is 5 MB gzipped total.
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
