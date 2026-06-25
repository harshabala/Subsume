import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ command }) => ({
  plugins: [
    preact(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'src/assets/icons/*', dest: 'icons' },
      ],
    }),
    {
      name: 'move-index-html',
      closeBundle() {
        const srcHtml = resolve(__dirname, 'dist/src/ui/index.html');
        const destDir = resolve(__dirname, 'dist/ui');
        const destHtml = resolve(__dirname, 'dist/ui/index.html');
        if (fs.existsSync(srcHtml)) {
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.renameSync(srcHtml, destHtml);
          fs.rmSync(resolve(__dirname, 'dist/src'), { recursive: true, force: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        ui: resolve(__dirname, 'src/ui/index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          return 'ui/assets/[name]-[hash].js';
        },
        chunkFileNames: 'ui/assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            if (assetInfo.name.includes('content')) return 'content.css';
            return 'ui/assets/[name]-[hash][extname]';
          }
          return 'ui/assets/[name]-[hash][extname]';
        },
      },
    },
    minify: command === 'serve' ? false : true,
  },
}));
