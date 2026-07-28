/**
 * Print detection fixture inventory and point at Vitest for the real run.
 *
 * Full metrics live in docs/detection-harness-results.json (regenerate via
 * the Vitest suite + evaluateFixture / summarizeHarness APIs).
 *
 *   npx vitest run tests/detectionHarness.test.ts
 *   node scripts/run-detection-harness.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(root, 'tests/fixtures/detection/manifest.json'), 'utf8')
);

const by = { book: 0, movie: 0, tv: 0, documentary: 0 };
for (const f of manifest.fixtures) by[f.expectedMedium]++;

console.log('Detection fixture inventory:', by, 'total=', manifest.fixtures.length);
console.log('Run accuracy suite: npx vitest run tests/detectionHarness.test.ts');
console.log('Report: docs/detection-accuracy-report.md');

const resultsPath = join(root, 'docs/detection-harness-results.json');
if (existsSync(resultsPath)) {
  const dump = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const b = dump.baseline;
  const f = dump.full;
  if (b && f) {
    console.log(
      `Last dump: baseline correct ${b.correctMedium}/${b.total}, full correct ${f.correctMedium}/${f.total}, wrongMedium=${f.wrongMedium}, FN=${f.falseNegatives}`
    );
    if (f.falseNegativeIds?.length) {
      console.log('  full FN ids:', f.falseNegativeIds.join(', '));
    }
  }
}
