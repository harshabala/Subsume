import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(__dirname, '..');
const TEXT_EXT = /\.(ts|tsx|css|html|js|json)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (TEXT_EXT.test(name)) out.push(p);
  }
  return out;
}

const GOOGLE_FONTS = /fonts\.(googleapis|gstatic)\.com/i;
// Remote stylesheet <link>s, or CSS @import / url() pointing at an https origin.
const REMOTE_LINK = /<link[^>]+(?:rel=["']stylesheet["'][^>]*href=["']https?:|href=["']https?:[^>]*rel=["']stylesheet["'])/i;
const REMOTE_IMPORT = /@import\s+(?:url\()?["']?https?:/i;
const REMOTE_FONT_URL = /@font-face[^}]*url\(\s*["']?https?:/is;

function scan(files: string[]): string[] {
  const hits: string[] = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (GOOGLE_FONTS.test(text)) hits.push(`${f}: google fonts`);
    if (/\.(html|css)$/.test(f)) {
      if (REMOTE_LINK.test(text)) hits.push(`${f}: remote stylesheet link`);
      if (REMOTE_IMPORT.test(text)) hits.push(`${f}: remote @import`);
      if (REMOTE_FONT_URL.test(text)) hits.push(`${f}: remote @font-face url`);
    }
    if (/\.(ts|tsx)$/.test(f) && /rel\s*=\s*['"]stylesheet['"]/.test(text)) {
      hits.push(`${f}: dynamically injected stylesheet link`);
    }
  }
  return hits;
}

describe('no third-party fonts', () => {
  it('src/ has no Google Fonts or remote stylesheet/font references', () => {
    expect(scan(walk(join(root, 'src')))).toEqual([]);
  });

  it('self-hosted fonts are bundled locally', () => {
    const dir = join(root, 'src/assets/fonts');
    expect(readdirSync(dir).filter((f) => f.endsWith('.woff2')).length).toBeGreaterThanOrEqual(9);
  });

  it.runIf(existsSync(join(root, 'dist')))('built dist/ has no remote font references', () => {
    expect(scan(walk(join(root, 'dist')))).toEqual([]);
  });
});
