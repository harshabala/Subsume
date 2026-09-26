import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs module without types
import { checkClassicScript } from '../scripts/verify-package-lib.mjs';

const built = resolve(__dirname, '../dist/content.js');

describe.skipIf(!existsSync(built))('built content script', () => {
  it('is a classic (IIFE) script, not an ES module', () => {
    expect(checkClassicScript('dist/content.js', readFileSync(built, 'utf8'))).toEqual([]);
  });
});
