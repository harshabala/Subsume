#!/usr/bin/env node
/**
 * Validate SEED_PEOPLE: each tmdb_person_{id} must resolve on TMDb to a person
 * whose display name matches the seed name (so we never ship Chiranjeevi as Mammootty again).
 *
 * Usage: npm run validate:seed-people
 * Exit 0 = ok, 1 = failures
 *
 * Network required. No API key — scrapes public person pages (og:title / og:image).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const seedPath = path.join(root, 'src/background/seedData.ts');

const UA =
  'Mozilla/5.0 (compatible; SubsumeSeedValidator/1.0; +https://github.com/harshabala/Subsume)';

function parseSeedPeople(source) {
  const people = [];
  // Match each SEED_PEOPLE object block loosely
  const blockRe =
    /\{\s*id:\s*'(tmdb_person_(\d+))',\s*name:\s*'((?:\\'|[^'])*)',[\s\S]*?profileImageUrl:\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = blockRe.exec(source)) !== null) {
    people.push({
      id: m[1],
      tmdbId: m[2],
      name: m[3].replace(/\\'/g, "'"),
      profileImageUrl: m[4],
    });
  }
  return people;
}

function normalizeName(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function namesMatch(seedName, pageTitle) {
  const a = normalizeName(seedName);
  const b = normalizeName(pageTitle);
  if (!a || !b) return false;
  if (a === b) return true;
  // TMDb may use slightly different spelling; require all significant tokens
  const tokens = a.split(' ').filter((t) => t.length > 2);
  if (tokens.length === 0) return a === b;
  return tokens.every((t) => b.includes(t));
}

function extractProfileFile(url) {
  const m = url.match(/\/t\/p\/[^/]+\/([^/?#]+)/);
  return m ? m[1] : null;
}

async function fetchPersonPage(tmdbId) {
  const url = `https://www.themoviedb.org/person/${tmdbId}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const html = await res.text();
  const title =
    html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*[-–].*$/, '').trim();
  const image = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1];
  return { title, image, url };
}

async function main() {
  const source = fs.readFileSync(seedPath, 'utf8');
  const people = parseSeedPeople(source);
  if (people.length === 0) {
    console.error('No SEED_PEOPLE entries parsed from seedData.ts');
    process.exit(1);
  }

  console.log(`Validating ${people.length} SEED_PEOPLE against themoviedb.org…\n`);

  const failures = [];
  for (const person of people) {
    process.stdout.write(`  ${person.name} (${person.id})… `);
    try {
      const page = await fetchPersonPage(person.tmdbId);
      const titleOk = namesMatch(person.name, page.title || '');
      const seedFile = extractProfileFile(person.profileImageUrl);
      const liveFile = page.image ? extractProfileFile(page.image) : null;
      // Profile path may lag TMDb CDN updates — warn if different, fail only on name mismatch
      const profileNote =
        seedFile && liveFile && seedFile !== liveFile
          ? ` (profile file differs: seed=${seedFile} live=${liveFile})`
          : '';

      if (!titleOk) {
        console.log('FAIL');
        failures.push({
          person,
          reason: `TMDb page is "${page.title}" — does not match seed name "${person.name}"`,
          url: page.url,
        });
      } else {
        console.log(`ok — "${page.title}"${profileNote}`);
      }
    } catch (err) {
      console.log('ERROR');
      failures.push({
        person,
        reason: err instanceof Error ? err.message : String(err),
        url: `https://www.themoviedb.org/person/${person.tmdbId}`,
      });
    }
    // Be polite to TMDb
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log('');
  if (failures.length) {
    console.error(`FAILED ${failures.length}/${people.length}:\n`);
    for (const f of failures) {
      console.error(`  ✗ ${f.person.name} [${f.person.id}]`);
      console.error(`    ${f.reason}`);
      console.error(`    ${f.url}\n`);
    }
    console.error(
      'Fix: open the person on themoviedb.org, copy the numeric id from the URL, and set id: `tmdb_person_{id}` + matching profileImageUrl.',
    );
    process.exit(1);
  }

  console.log(`All ${people.length} seed people match TMDb identity.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
