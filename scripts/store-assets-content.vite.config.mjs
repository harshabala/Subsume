// Capture-harness only: bundles src/content/index.ts as a single classic (IIFE) script.
// The regular build emits content.js as an ES module with shared-chunk imports, which
// Chrome refuses to run as a content script ("Cannot use import statement outside a
// module"). scripts/render-store-assets.py uses this bundle in a temp copy of dist/ so the
// real content-script code can be photographed. It changes nothing in the repo build.
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

export default defineConfig({
  root,
  plugins: [preact()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  build: {
    outDir: process.env.SUBSUME_CONTENT_OUT,
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: resolve(root, 'src/content/index.ts'),
      formats: ['iife'],
      name: 'SubsumeContent',
      fileName: () => 'content.js',
    },
  },
});
