/**
 * Pure assertion helpers for scripts/verify-package.mjs (unit-tested in tests/verifyPackage.test.ts).
 * Each check returns an array of human-readable problem strings (empty = pass).
 */

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Read width/height from a PNG buffer, or null if not a valid PNG. */
export function readPngSize(buf) {
  if (!buf || buf.length < 24) return null;
  for (let i = 0; i < 8; i++) if (buf[i] !== PNG_SIGNATURE[i]) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function checkManifestBasics(manifest, pkgVersion, { allowKey = false } = {}) {
  const problems = [];
  if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
  if (!manifest.name) problems.push('manifest name missing');
  if (!manifest.description) problems.push('manifest description missing');
  else if (manifest.description.length > 132) problems.push('description exceeds 132 chars');
  if (manifest.version !== pkgVersion) {
    problems.push(`manifest version ${manifest.version} != package.json version ${pkgVersion}`);
  }
  if (!manifest.minimum_chrome_version) problems.push('minimum_chrome_version not set');
  if (!allowKey && 'key' in manifest) {
    problems.push('manifest "key" present: Web Store rejects it on first upload (set SUBSUME_KEEP_KEY=1 to allow)');
  }
  return problems;
}

export function checkIcons(manifest, readFile) {
  const problems = [];
  for (const size of [16, 48, 128]) {
    const path = manifest.icons?.[String(size)];
    if (!path) {
      problems.push(`icons.${size} missing from manifest`);
      continue;
    }
    const buf = readFile(path);
    if (!buf) {
      problems.push(`icon ${path} not in zip`);
      continue;
    }
    const dim = readPngSize(buf);
    if (!dim) problems.push(`icon ${path} is not a valid PNG`);
    else if (dim.width !== size || dim.height !== size) {
      problems.push(`icon ${path} is ${dim.width}x${dim.height}, expected ${size}x${size}`);
    }
  }
  return problems;
}

/** Collect every file path a manifest references (globs in web_accessible_resources skipped). */
export function collectManifestRefs(manifest) {
  const refs = new Set();
  const add = (p) => {
    if (typeof p === 'string' && p && !/^[a-z]+:/i.test(p)) refs.add(p.replace(/^\//, ''));
  };
  add(manifest.background?.service_worker);
  for (const cs of manifest.content_scripts ?? []) {
    (cs.js ?? []).forEach(add);
    (cs.css ?? []).forEach(add);
  }
  add(manifest.action?.default_popup);
  Object.values(manifest.action?.default_icon ?? {}).forEach(add);
  add(manifest.options_page);
  add(manifest.options_ui?.page);
  add(manifest.side_panel?.default_path);
  Object.values(manifest.icons ?? {}).forEach(add);
  for (const war of manifest.web_accessible_resources ?? []) {
    (war.resources ?? []).forEach((r) => {
      if (!r.includes('*')) add(r);
    });
  }
  return [...refs];
}

export function checkRefsExist(manifest, fileSet) {
  return collectManifestRefs(manifest)
    .filter((p) => !fileSet.has(p))
    .map((p) => `manifest references missing file: ${p}`);
}

/**
 * Forbidden paths. The zip must contain only built output; source, tests, tooling, docs,
 * VCS data, keys and env files are never shipped. Source maps are deliberately NOT shipped
 * (they expose original source and bloat the package; the package script excludes them).
 */
const FORBIDDEN = [
  [/(^|\/)src\//, 'src/'],
  [/(^|\/)tests?\//, 'tests/'],
  [/(^|\/)node_modules\//, 'node_modules/'],
  [/(^|\/)\.git(\/|$)/, '.git'],
  [/(^|\/)docs\//, 'docs/'],
  [/(^|\/)scripts\//, 'scripts/'],
  [/\.pem$/i, '*.pem'],
  [/(^|\/)\.env(\.|$)/, '.env'],
  [/\.map$/i, 'source map'],
  [/(^|\/)icon-master\.png$/, 'icon-master.png (unshipped master art)'],
  [/(^|\/)\.DS_Store$/, '.DS_Store'],
];

export function checkForbiddenPaths(paths) {
  const problems = [];
  for (const p of paths) {
    for (const [re, label] of FORBIDDEN) {
      if (re.test(p)) {
        problems.push(`forbidden file in package (${label}): ${p}`);
        break;
      }
    }
  }
  return problems;
}

const SECRET_PATTERNS = [
  ['OpenAI/Anthropic-style key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Bearer token literal', /\bBearer\s+[A-Za-z0-9._~+/-]{24,}={0,2}/],
  ['private key PEM header', /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
];

/** Scan a text for secret-looking strings. Returns labels of matches. */
export function findSecrets(text) {
  return SECRET_PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
}

/** MV3 remote-code / CSP checks for shipped JS and HTML text. */
export function checkRemoteCode(path, text) {
  const problems = [];
  if (/\.html?$/i.test(path)) {
    if (/<script\b(?![^>]*\bsrc=)[^>]*>[^<]*\S/i.test(text)) problems.push(`inline <script> in ${path}`);
    if (/<script\b[^>]*\bsrc=["']https?:/i.test(text)) problems.push(`remote <script src> in ${path}`);
    if (/\son[a-z]+\s*=\s*["']/i.test(text)) problems.push(`inline event handler attribute in ${path}`);
  }
  if (/\.m?js$/i.test(path)) {
    if (/\beval\s*\(/.test(text)) problems.push(`eval( in ${path}`);
    if (/\bnew Function\s*\(/.test(text)) problems.push(`new Function( in ${path}`);
    if (/\bimport\(\s*["']https?:/.test(text) || /\bimportScripts\(\s*["']https?:/.test(text)) {
      problems.push(`remote code import in ${path}`);
    }
  }
  return problems;
}

/**
 * Manifest content scripts are loaded by Chrome as classic scripts, so they must not
 * contain ES module syntax (static import/export). Returns a list of problems.
 */
export function checkClassicScript(path, text) {
  const problems = [];
  const head = text.slice(0, 4000);
  if (/(^|[;}\s])import\s*[{*"'\w]/.test(head) && /from\s*["'][^"']+["']/.test(head)) {
    problems.push(`${path}: contains static ES imports; content scripts must be classic (IIFE) bundles`);
  }
  if (/(^|[;}\s])export\s*(\{|default|const|function|class)/.test(text)) {
    problems.push(`${path}: contains ES exports; content scripts must be classic (IIFE) bundles`);
  }
  return problems;
}
