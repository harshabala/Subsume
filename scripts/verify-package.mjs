/**
 * Inspect subsume.zip (built by `npm run package`) and fail if it is not Web-Store ready.
 * Builds nothing. Usage: node scripts/verify-package.mjs [path/to/zip]
 * Set SUBSUME_KEEP_KEY=1 to allow the manifest "key" field (matches the package script).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkForbiddenPaths,
  checkIcons,
  checkManifestBasics,
  checkRefsExist,
  checkClassicScript,
  checkRemoteCode,
  findSecrets,
} from './verify-package-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = resolve(process.argv[2] ?? join(root, 'subsume.zip'));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!existsSync(zipPath)) {
  console.error(`error: ${zipPath} not found. Run \`npm run package\` first.`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'subsume-verify-'));
const problems = [];
try {
  execFileSync('unzip', ['-q', zipPath, '-d', tmp]);
  const files = walk(tmp).map((f) => relative(tmp, f).split('\\').join('/'));
  const fileSet = new Set(files);

  if (!fileSet.has('manifest.json')) {
    problems.push('manifest.json missing at zip root');
  } else {
    const manifest = JSON.parse(readFileSync(join(tmp, 'manifest.json'), 'utf8'));
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    problems.push(
      ...checkManifestBasics(manifest, pkg.version, { allowKey: process.env.SUBSUME_KEEP_KEY === '1' }),
      ...checkIcons(manifest, (p) => (fileSet.has(p) ? readFileSync(join(tmp, p)) : null)),
      ...checkRefsExist(manifest, fileSet),
    );
    for (const cs of manifest.content_scripts ?? []) {
      for (const js of cs.js ?? []) {
        if (fileSet.has(js)) problems.push(...checkClassicScript(js, readFileSync(join(tmp, js), 'utf8')));
      }
    }
    if (manifest.content_security_policy) {
      const csp = JSON.stringify(manifest.content_security_policy);
      if (/unsafe-eval|https?:\/\/[^ ']+/.test(csp)) problems.push(`CSP allows remote/unsafe sources: ${csp}`);
    }
  }

  problems.push(...checkForbiddenPaths(files));

  for (const f of files) {
    if (!/\.(js|mjs|css|html|json|txt|svg)$/i.test(f)) continue;
    const text = readFileSync(join(tmp, f), 'utf8');
    for (const label of findSecrets(text)) problems.push(`possible secret (${label}) in ${f}`);
    problems.push(...checkRemoteCode(f, text));
  }

  const size = statSync(zipPath).size;
  console.log(`Package: ${zipPath}`);
  console.log(`Files: ${files.length}; size: ${size} bytes (${(size / 1024).toFixed(1)} KB / ${(size / 1048576).toFixed(2)} MB)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (problems.length) {
  console.error(`\nVerification FAILED (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('Verification passed.');
