/**
 * Stage A — Parse application/ld+json for Book / Audiobook structured data.
 * Never requires network; operates only on the provided Document.
 */

import type { DetectionCandidate } from '@/shared/catalogTypes';
import {
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
  toIsbn13,
} from '@/shared/isbn';

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

function isBookType(types: string[]): boolean {
  return types.some((t) => t === 'book' || t === 'audiobook' || t === 'bookseries');
}

function authorNames(author: unknown): string[] {
  const names: string[] = [];
  for (const entry of asArray(author)) {
    if (typeof entry === 'string') {
      const n = entry.trim();
      if (n) names.push(n);
    } else if (entry && typeof entry === 'object') {
      const obj = entry as JsonLdNode;
      const n = String(obj.name ?? obj['@name'] ?? '').trim();
      if (n) names.push(n);
    }
  }
  return names;
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

function yearFromDate(datePublished: unknown): number | undefined {
  if (typeof datePublished !== 'string') return undefined;
  const m = datePublished.match(/^(\d{4})/);
  if (!m) return undefined;
  const y = Number(m[1]);
  return y >= 1000 && y <= 2100 ? y : undefined;
}

function collectIsbns(node: JsonLdNode): { isbn10: string[]; isbn13: string[] } {
  const isbn10: string[] = [];
  const isbn13: string[] = [];
  const seen10 = new Set<string>();
  const seen13 = new Set<string>();

  const raws = [
    ...asArray(node.isbn),
    ...asArray(node.isbn13),
    ...asArray(node.isbn10),
    ...asArray((node.identifier as JsonLdNode | undefined)?.value),
  ];

  // identifier may be array of objects
  for (const id of asArray(node.identifier)) {
    if (typeof id === 'string') raws.push(id);
    else if (id && typeof id === 'object') {
      const obj = id as JsonLdNode;
      if (obj.value != null) raws.push(obj.value);
      if (obj['@value'] != null) raws.push(obj['@value']);
    }
  }

  for (const raw of raws) {
    if (raw == null) continue;
    const n = normalizeIsbn(String(raw));
    if (n.length === 10 && isValidIsbn10(n) && !seen10.has(n)) {
      seen10.add(n);
      isbn10.push(n);
      const as13 = toIsbn13(n);
      if (as13 && !seen13.has(as13)) {
        seen13.add(as13);
        isbn13.push(as13);
      }
    } else if (n.length === 13 && isValidIsbn13(n) && !seen13.has(n)) {
      seen13.add(n);
      isbn13.push(n);
    }
  }

  return { isbn10, isbn13 };
}

function parseJsonLdText(text: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as JsonLdNode;
      if (Array.isArray(obj['@graph'])) {
        return [obj, ...obj['@graph']];
      }
      return [obj];
    }
    return [];
  } catch {
    // Some pages embed multiple JSON objects back-to-back
    try {
      const wrapped = JSON.parse(`[${trimmed.replace(/}\s*{/g, '},{')}]`) as unknown[];
      return Array.isArray(wrapped) ? wrapped : [];
    } catch {
      return [];
    }
  }
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
  if (node.mainEntity) walkNodes(node.mainEntity, out);
  if (node['@graph']) walkNodes(node['@graph'], out);
  if (node.itemListElement) {
    for (const item of asArray(node.itemListElement)) {
      if (item && typeof item === 'object') {
        const el = item as JsonLdNode;
        walkNodes(el.item ?? el, out);
      }
    }
  }
}

function scoreBookNode(hasIsbn: boolean, hasAuthor: boolean, hasImage: boolean): number {
  // Structured Book + valid ISBN is high confidence (≥ 0.85)
  if (hasIsbn && hasAuthor) return 0.95;
  if (hasIsbn) return 0.9;
  if (hasAuthor) return 0.88;
  if (hasImage) return 0.86;
  return 0.85;
}

function nodeToCandidate(node: JsonLdNode, sourcePageUrl: string): DetectionCandidate | null {
  const types = typeTokens(node);
  if (!isBookType(types)) return null;

  const title = String(node.name ?? node.headline ?? '').trim();
  if (!title) return null;

  const authors = authorNames(node.author);
  const { isbn10, isbn13 } = collectIsbns(node);
  const hasIsbn = isbn10.length > 0 || isbn13.length > 0;
  const img = imageUrl(node.image);
  const year = yearFromDate(node.datePublished);
  const confidence = scoreBookNode(hasIsbn, authors.length > 0, Boolean(img));

  const evidence: DetectionCandidate['evidence'] = [
    { type: 'json_ld', value: types[0] || 'Book', weight: 0.85 },
  ];
  if (hasIsbn) {
    evidence.push({
      type: 'isbn',
      value: isbn13[0] || isbn10[0],
      weight: 0.9,
    });
  }

  return {
    medium: 'book',
    title,
    authorOrCreator: authors.length ? authors : undefined,
    year,
    isbn10: isbn10.length ? isbn10 : undefined,
    isbn13: isbn13.length ? isbn13 : undefined,
    imageUrl: img,
    sourcePageUrl,
    confidence,
    evidence,
    providerHint: undefined,
  };
}

/** Extract book candidates from JSON-LD script tags in the document. */
export function detectJsonLdBooks(doc: Document, sourcePageUrl: string): DetectionCandidate[] {
  const candidates: DetectionCandidate[] = [];
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    const text = script.textContent || '';
    const roots = parseJsonLdText(text);
    const nodes: JsonLdNode[] = [];
    for (const root of roots) walkNodes(root, nodes);

    for (const node of nodes) {
      const c = nodeToCandidate(node, sourcePageUrl);
      if (c) candidates.push(c);
    }
  }

  return candidates;
}
