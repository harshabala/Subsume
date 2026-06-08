import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/background/storage.ts',
        'src/background/llm.ts',
        'src/background/context.ts',
        'src/background/recommendations.ts',
        'src/content/scanner.ts',
      ],
      exclude: [
        'src/ui/**',
        'src/content/hoverCard.tsx',
        'src/content/posterBadge.tsx',
        'src/content/index.ts',
        'src/background/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
