import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// package.json has "type": "module", so this file runs as native ESM —
// there is no CommonJS __dirname/__filename here. Resolve the entry path
// from import.meta.url instead (requires @types/node for node:url's types).
const entry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

// Single config for both build and test (vitest/config's defineConfig
// merges Vite's and Vitest's types) — avoids maintaining two near-identical
// config files for a project this size.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry,
      name: 'HiperMvhrCard',
      formats: ['es'],
      fileName: () => 'hiper-mvhr-card.js',
    },
    rollupOptions: {
      output: {
        // HACS expects a single distributable JS file.
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    open: '/dev/preview.html',
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/unit/**/*.test.ts'],
  },
});
