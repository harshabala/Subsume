import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const pkgVersion: string = JSON.parse(read('package.json')).version;

describe('release docs stay accurate', () => {
  it('manifest.json version equals package.json version', () => {
    expect(JSON.parse(read('manifest.json')).version).toBe(pkgVersion);
  });

  it('every 0.x.y version string in store/*.md and README.md equals package.json version', () => {
    const files = readdirSync(join(root, 'store'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => `store/${f}`)
      .concat('README.md');
    const stale: string[] = [];
    for (const file of files) {
      const matches = read(file).match(/\b0\.\d+\.\d+\b/g) ?? [];
      for (const v of matches) {
        if (v !== pkgVersion) stale.push(`${file}: ${v}`);
      }
    }
    expect(stale).toEqual([]);
  });

  it('privacy docs do not claim API keys are unencrypted at rest', () => {
    for (const file of ['docs/PRIVACY.md', 'docs/privacy.html', 'store/LISTING.md', 'store/PERMISSIONS.md', 'README.md']) {
      const text = read(file).replace(/<[^>]+>/g, '').replace(/[*`_]/g, '').replace(/\s+/g, ' ');
      expect(text, file).not.toMatch(/not encrypted at rest/i);
      expect(text, file).not.toMatch(/not\s+encrypted\s+by\s+subsume\s+for\s+local\s+storage/i);
    }
  });

  it('privacy policy discloses encryption limits and local-only diagnostics', () => {
    for (const file of ['docs/PRIVACY.md', 'docs/privacy.html']) {
      const text = read(file).replace(/<[^>]+>/g, '').replace(/\*/g, '');
      expect(text, file).toContain('AES-GCM');
      expect(text, file).toContain('same browser profile');
      expect(text, file).toContain('September 26, 2026');
    }
  });
});
