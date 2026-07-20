/**
 * Package dist/ contents into subsume.zip at the repo root.
 * Zip root = files inside dist/ (does not nest a dist/ folder).
 * Source maps (*.map) are excluded.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';
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

// Archive contents of dist/ at zip root; exclude source maps and master icon source
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
  { cwd: distDir, stdio: 'inherit' },
);

const { size } = statSync(zipPath);
const kb = (size / 1024).toFixed(1);
const mb = (size / (1024 * 1024)).toFixed(2);
console.log(`Created ${zipPath}`);
console.log(`Size: ${size} bytes (${kb} KB / ${mb} MB)`);
