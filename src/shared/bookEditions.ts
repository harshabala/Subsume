import type { BookEdition } from './catalogTypes';

/** Common ISO 639-2/3 → short display labels for edition lists. */
const LANGUAGE_LABELS: Record<string, string> = {
  eng: 'English',
  en: 'English',
  fre: 'French',
  fra: 'French',
  fr: 'French',
  spa: 'Spanish',
  es: 'Spanish',
  ger: 'German',
  deu: 'German',
  de: 'German',
  ita: 'Italian',
  it: 'Italian',
  por: 'Portuguese',
  pt: 'Portuguese',
  rus: 'Russian',
  ru: 'Russian',
  jpn: 'Japanese',
  ja: 'Japanese',
  chi: 'Chinese',
  zho: 'Chinese',
  zh: 'Chinese',
  kor: 'Korean',
  ko: 'Korean',
  ara: 'Arabic',
  ar: 'Arabic',
  hin: 'Hindi',
  hi: 'Hindi',
  und: 'Unknown',
};

/**
 * Human-readable language for an edition (OL keys are usually 3-letter codes).
 */
export function formatEditionLanguage(language?: string | null): string | undefined {
  if (!language?.trim()) return undefined;
  const raw = language.trim();
  const key = raw.toLowerCase().replace(/^\/languages\//, '');
  return LANGUAGE_LABELS[key] ?? raw.toUpperCase();
}

/**
 * Prefer ISBN-13, then ISBN-10.
 */
export function formatEditionIsbn(edition: Pick<BookEdition, 'isbn13' | 'isbn10'>): string | undefined {
  const isbn13 = edition.isbn13?.find((v) => typeof v === 'string' && v.trim());
  if (isbn13) return isbn13.trim();
  const isbn10 = edition.isbn10?.find((v) => typeof v === 'string' && v.trim());
  if (isbn10) return isbn10.trim();
  return undefined;
}

/**
 * Compact meta parts for list rows: language · ISBN · publisher · format · date.
 */
export function editionMetaParts(
  edition: Pick<
    BookEdition,
    'language' | 'isbn13' | 'isbn10' | 'publisher' | 'format' | 'publishedDate' | 'pageCount'
  >,
): string[] {
  const parts: string[] = [];
  const lang = formatEditionLanguage(edition.language);
  if (lang) parts.push(lang);
  const isbn = formatEditionIsbn(edition);
  if (isbn) parts.push(`ISBN ${isbn}`);
  if (edition.publisher?.trim()) parts.push(edition.publisher.trim());
  if (edition.format) parts.push(edition.format);
  if (edition.publishedDate?.trim()) parts.push(edition.publishedDate.trim());
  if (typeof edition.pageCount === 'number' && edition.pageCount > 0) {
    parts.push(`${edition.pageCount} pp`);
  }
  return parts;
}

/**
 * Single-line label for selects / accessibility: title · meta…
 */
export function formatEditionListLabel(
  edition: Pick<
    BookEdition,
    | 'title'
    | 'subtitle'
    | 'language'
    | 'isbn13'
    | 'isbn10'
    | 'publisher'
    | 'format'
    | 'publishedDate'
    | 'pageCount'
  >,
): string {
  const title = edition.subtitle?.trim()
    ? `${edition.title.trim()} — ${edition.subtitle.trim()}`
    : edition.title.trim();
  const meta = editionMetaParts(edition);
  if (meta.length === 0) return title || 'Edition';
  return [title || 'Edition', ...meta].join(' · ');
}

/**
 * Preferred edition first; stable relative order among the rest.
 */
export function sortEditionsPreferredFirst<T extends { id: string }>(
  editions: T[],
  preferredEditionId?: string | null,
): T[] {
  if (!preferredEditionId || editions.length < 2) return editions.slice();
  const preferred = editions.filter((e) => e.id === preferredEditionId);
  if (preferred.length === 0) return editions.slice();
  const rest = editions.filter((e) => e.id !== preferredEditionId);
  return [...preferred, ...rest];
}
