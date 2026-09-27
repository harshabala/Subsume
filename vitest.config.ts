import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/shared/messages.ts',
        'src/background/events.ts',
        'src/background/storage.ts',
        'src/background/llm.ts',
        'src/background/context.ts',
        'src/background/recommendations.ts',
        'src/background/handlers/**/*.ts',
        'src/content/scanner.ts',
      ],
      // Core logic is held at 100%: a drop fails `npm run test:coverage` and CI.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
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
