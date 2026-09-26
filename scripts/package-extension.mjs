/**
 * Package dist/ contents into subsume.zip at the repo root.
 * Zip root = files inside dist/ (does not nest a dist/ folder).
 * Source maps (*.map) are excluded.
 *
 * The manifest "key" field is STRIPPED from the packaged manifest: the Chrome Web Store
 * rejects a first upload whose manifest contains "key" ("key field is not allowed") because
 * the store assigns the item's ID itself. dist/manifest.json (for unpacked dev loading) keeps
 * the key so the dev ID stays stable. Set SUBSUME_KEEP_KEY=1 to keep it in the zip (e.g. for
 * later uploads of an item whose store key you have pasted back in, or self-hosted builds).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const zipPath = join(root, 'subsume.zip');

if (!existsSync(distDir)) {
  console.error('error: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

if (existsSync(zipPath)) {
  unlinkSync(zipPath);
}

// Stage a copy of dist/ so the shipped manifest can differ from the dev manifest.
const stageDir = mkdtempSync(join(tmpdir(), 'subsume-pkg-'));
cpSync(distDir, stageDir, { recursive: true });
if (process.env.SUBSUME_KEEP_KEY !== '1') {
  const manifestPath = join(stageDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if ('key' in manifest) {
    delete manifest.key;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Stripped manifest "key" from packaged manifest (Web Store assigns its own ID).');
  }
}

// Archive contents of the staged dir at zip root; exclude source maps and master icon source
execFileSync(
  'zip',
  [
    '-r',
    '-q',
    zipPath,
    '.',
    '-x',
    '*.map',
    '-x',
    '**/*.map',
    '-x',
    'icons/icon-master.png',
    '-x',
    '**/icon-master.png',
  ],
  { cwd: stageDir, stdio: 'inherit' },
);
rmSync(stageDir, { recursive: true, force: true });

const { size } = statSync(zipPath);
const kb = (size / 1024).toFixed(1);
const mb = (size / (1024 * 1024)).toFixed(2);
console.log(`Created ${zipPath}`);
console.log(`Size: ${size} bytes (${kb} KB / ${mb} MB)`);
