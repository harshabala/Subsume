import { describe, it, expect } from 'vitest';
import {
  readPngSize,
  checkManifestBasics,
  checkIcons,
  collectManifestRefs,
  checkRefsExist,
  checkForbiddenPaths,
  findSecrets,
  checkRemoteCode,
  // @ts-expect-error plain .mjs module without types
} from '../scripts/verify-package-lib.mjs';

function png(w: number, h: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

const good = {
  manifest_version: 3,
  name: 'x',
  description: 'd',
  version: '1.0.0',
  minimum_chrome_version: '111',
  icons: { '16': 'i16.png', '48': 'i48.png', '128': 'i128.png' },
  background: { service_worker: 'background.js' },
  content_scripts: [{ matches: ['https://*/*'], js: ['content.js'], css: ['content.css'] }],
  action: { default_popup: 'ui/popup.html' },
  options_page: 'ui/index.html',
  web_accessible_resources: [{ resources: ['a.png', 'dir/*'], matches: ['https://*/*'] }],
};

describe('verify-package helpers', () => {
  it('reads PNG dimensions and rejects non-PNG', () => {
    expect(readPngSize(png(16, 16))).toEqual({ width: 16, height: 16 });
    expect(readPngSize(Buffer.from('not a png at all, definitely not'))).toBeNull();
  });

  it('checks manifest basics', () => {
    expect(checkManifestBasics(good, '1.0.0')).toEqual([]);
    expect(checkManifestBasics({ ...good, manifest_version: 2 }, '1.0.0')).not.toEqual([]);
    expect(checkManifestBasics(good, '2.0.0').join()).toMatch(/version/);
    expect(checkManifestBasics({ ...good, key: 'abc' }, '1.0.0').join()).toMatch(/key/);
    expect(checkManifestBasics({ ...good, key: 'abc' }, '1.0.0', { allowKey: true })).toEqual([]);
  });

  it('validates icon sizes', () => {
    const files: Record<string, Buffer> = { 'i16.png': png(16, 16), 'i48.png': png(48, 48), 'i128.png': png(128, 128) };
    expect(checkIcons(good, (p: string) => files[p] ?? null)).toEqual([]);
    files['i48.png'] = png(32, 32);
    expect(checkIcons(good, (p: string) => files[p] ?? null).join()).toMatch(/48x48/);
    delete files['i16.png'];
    expect(checkIcons(good, (p: string) => files[p] ?? null).join()).toMatch(/not in zip/);
  });

  it('collects and checks manifest references (skipping globs)', () => {
    expect(collectManifestRefs(good)).toContain('content.css');
    expect(collectManifestRefs(good)).not.toContain('dir/*');
    const present = new Set<string>(collectManifestRefs(good));
    expect(checkRefsExist(good, present)).toEqual([]);
    present.delete('background.js');
    expect(checkRefsExist(good, present)).toEqual(['manifest references missing file: background.js']);
  });

  it('flags forbidden paths', () => {
    expect(checkForbiddenPaths(['background.js', 'ui/assets/a.js', 'icons/icon16.png'])).toEqual([]);
    const bad = checkForbiddenPaths(['src/a.ts', 'x.js.map', 'k.pem', '.env', 'docs/a.md', 'node_modules/a/b.js']);
    expect(bad).toHaveLength(6);
  });

  it('detects secret-looking strings', () => {
    expect(findSecrets('const a = 1; sk-')).toEqual([]);
    expect(findSecrets('k="sk-proj-abcdefghijklmnopqrstuvwx"')).toHaveLength(1);
    expect(findSecrets('AIza' + 'A'.repeat(35))).toHaveLength(1);
    expect(findSecrets('Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345')).toHaveLength(1);
    expect(findSecrets('-----BEGIN PRIVATE KEY-----')).toHaveLength(1);
    expect(findSecrets('Bearer ${token}')).toEqual([]);
  });

  it('detects remote code and inline script violations', () => {
    expect(checkRemoteCode('a.html', '<script type="module" src="./a.js"></script>')).toEqual([]);
    expect(checkRemoteCode('a.html', '<script src="https://cdn.x/y.js"></script>')).toHaveLength(1);
    expect(checkRemoteCode('a.html', '<script>alert(1)</script>')).toHaveLength(1);
    expect(checkRemoteCode('a.html', '<button onclick="x()">')).toHaveLength(1);
    expect(checkRemoteCode('a.js', 'x=eval("1")')).toHaveLength(1);
    expect(checkRemoteCode('a.js', 'new Function("a")')).toHaveLength(1);
    expect(checkRemoteCode('a.js', 'const retrieval=1;')).toEqual([]);
  });
});
