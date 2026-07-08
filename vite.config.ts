import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    preact(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
          transform: (content) => {
            const base = JSON.parse(content.toString());
            return JSON.stringify(base, null, 2);
          },
        },
      ],
    }),
    {
      name: 'post-build-fix',
      closeBundle() {
        const destDir = resolve(__dirname, 'dist/ui');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        for (const name of ['index', 'popup']) {
          const srcHtml = resolve(__dirname, `dist/src/ui/${name}.html`);
          const destHtml = resolve(__dirname, `dist/ui/${name}.html`);
          if (fs.existsSync(srcHtml)) {
            fs.renameSync(srcHtml, destHtml);
          }
          if (fs.existsSync(destHtml)) {
            let html = fs.readFileSync(destHtml, 'utf8');
            html = html
              .replace(/\.\.\/\.\.\/ui\/assets\//g, './assets/')
              .replace(/\/ui\/assets\//g, './assets/');
            fs.writeFileSync(destHtml, html);
          }
        }
        const distSrc = resolve(__dirname, 'dist/src');
        if (fs.existsSync(distSrc)) {
          fs.rmSync(distSrc, { recursive: true, force: true });
        }
        const srcIcons = resolve(__dirname, 'src/assets/icons');
        const destIcons = resolve(__dirname, 'dist/icons');
        if (fs.existsSync(srcIcons)) {
          fs.cpSync(srcIcons, destIcons, { recursive: true, force: true });
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
        popup: resolve(__dirname, 'src/ui/popup.html'),
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
