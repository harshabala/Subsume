/**
 * Parse application/ld+json for Movie / TVSeries / related screen works.
 * Documentary is a screenKind on Movie (genre / keywords), not a separate schema type.
 */

export type ScreenKind = 'movie' | 'tv' | 'documentary';

export interface ScreenDetectionCandidate {
  medium: 'movie' | 'tv';
  /** Refined kind for harness / UI; documentaries remain medium=movie for storage. */
  screenKind: ScreenKind;
  title: string;
  year?: number;
  imageUrl?: string;
  sourcePageUrl: string;
  confidence: number;
  evidence: Array<{ type: string; value?: string; weight: number }>;
  providerHint?: string;
}

type JsonLdNode = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function typeTokens(node: JsonLdNode): string[] {
  const raw = node['@type'];
  return asArray(raw)
    .map((t) => String(t).replace(/^https?:\/\/schema\.org\//i, ''))
    .map((t) => t.toLowerCase());
}

function isTvType(types: string[]): boolean {
  return types.some(
    (t) =>
      t === 'tvseries' ||
      t === 'tvseason' ||
      t === 'tvepisode' ||
      t === 'radioseries' ||
      t === 'tvshow'
  );
}

function isMovieType(types: string[]): boolean {
  return types.some((t) => t === 'movie' || t === 'motionpicture' || t === 'videoobject');
}

function nameOf(node: JsonLdNode): string {
  const n = node.name ?? node.headline ?? node.alternateName;
  if (typeof n === 'string') return n.trim();
  if (Array.isArray(n) && typeof n[0] === 'string') return n[0].trim();
  return '';
}

function yearFromDate(datePublished: unknown): number | undefined {
  if (typeof datePublished !== 'string') return undefined;
  const m = datePublished.match(/^(\d{4})/);
  if (!m) return undefined;
  const y = Number(m[1]);
  return y >= 1880 && y <= 2100 ? y : undefined;
}

function imageUrl(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image || undefined;
  if (Array.isArray(image)) {
    for (const item of image) {
      const u = imageUrl(item);
      if (u) return u;
    }
    return undefined;
  }
  if (typeof image === 'object') {
    const obj = image as JsonLdNode;
    const url = obj.url ?? obj.contentUrl ?? obj['@id'];
    if (typeof url === 'string' && url) return url;
  }
  return undefined;
}

function genreText(node: JsonLdNode): string {
  const parts: string[] = [];
  for (const g of asArray(node.genre)) {
    if (typeof g === 'string') parts.push(g);
    else if (g && typeof g === 'object') {
      const name = (g as JsonLdNode).name;
      if (typeof name === 'string') parts.push(name);
    }
  }
  for (const k of asArray(node.keywords)) {
    if (typeof k === 'string') parts.push(k);
  }
  return parts.join(' ').toLowerCase();
}

function isDocumentarySignal(node: JsonLdNode, title: string): boolean {
  const g = genreText(node);
  if (/\bdocumentary\b|\bdocuseries\b|\bnon[- ]fiction film\b/.test(g)) return true;
  if (/\bdocumentary\b/i.test(title)) return true;
  const desc = String(node.description ?? '').toLowerCase();
  if (/\bdocumentary film\b|\bthis documentary\b/.test(desc.slice(0, 400))) return true;
  return false;
}

function walkNodes(root: unknown, out: JsonLdNode[]): void {
  if (!root) return;
  if (Array.isArray(root)) {
    for (const item of root) walkNodes(item, out);
    return;
  }
  if (typeof root !== 'object') return;
  const node = root as JsonLdNode;
  out.push(node);
  if (node['@graph']) walkNodes(node['@graph'], out);
  // nested itemListElement etc.
  for (const key of ['itemListElement', 'hasPart', 'workExample']) {
    if (node[key]) walkNodes(node[key], out);
  }
}

function parseScriptJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some pages emit trailing commas or NDJSON-ish — best effort strip
    try {
      const cleaned = text.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function candidateFromNode(
  node: JsonLdNode,
  sourcePageUrl: string
): ScreenDetectionCandidate | null {
  const types = typeTokens(node);
  const tv = isTvType(types);
  const movie = isMovieType(types);
  if (!tv && !movie) return null;

  const title = nameOf(node);
  if (!title || title.length < 2) return null;

  const documentary = !tv && isDocumentarySignal(node, title);
  const year =
    yearFromDate(node.datePublished) ??
    yearFromDate(node.dateCreated) ??
    yearFromDate(node.releaseDate);

  let confidence = 0.88;
  if (node.image || node.trailer) confidence += 0.03;
  if (year) confidence += 0.02;
  if (documentary) confidence = Math.min(0.95, confidence + 0.01);
  confidence = Math.min(0.97, confidence);

  const screenKind: ScreenKind = tv ? 'tv' : documentary ? 'documentary' : 'movie';

  return {
    medium: tv ? 'tv' : 'movie',
    screenKind,
    title,
    year,
    imageUrl: imageUrl(node.image),
    sourcePageUrl,
    confidence,
    evidence: [
      { type: 'json_ld', value: types.join(','), weight: 0.9 },
      ...(documentary
        ? [{ type: 'json_ld' as const, value: 'documentary', weight: 0.85 }]
        : []),
    ],
  };
}

/** Extract screen work candidates from JSON-LD in the document. */
export function detectJsonLdScreenWorks(
  doc: Document,
  sourcePageUrl: string
): ScreenDetectionCandidate[] {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const nodes: JsonLdNode[] = [];
  for (const script of scripts) {
    const text = script.textContent?.trim();
    if (!text) continue;
    const parsed = parseScriptJson(text);
    walkNodes(parsed, nodes);
  }

  const results: ScreenDetectionCandidate[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const c = candidateFromNode(node, sourcePageUrl);
    if (!c) continue;
    const key = `${c.screenKind}::${c.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(c);
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
