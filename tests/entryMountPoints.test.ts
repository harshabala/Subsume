import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI = resolve(__dirname, '../src/ui');

describe('UI entry mount points', () => {
  it.each([
    ['popup.tsx', 'popup.html'],
    ['index.tsx', 'index.html'],
  ])('%s mounts on an element that exists in %s', (entry, html) => {
    const source = readFileSync(resolve(UI, entry), 'utf8');
    const match = source.match(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/);
    expect(match, `${entry} must mount via getElementById`).not.toBeNull();
    const markup = readFileSync(resolve(UI, html), 'utf8');
    expect(markup).toContain(`id="${match![1]}"`);
  });
});
