/** Shared excerpt length for reflection copy on cards and list rows. */
export const REFLECTION_CARD_EXCERPT_MAX = 120;

export function truncateForExcerpt(text: string, maxLen = REFLECTION_CARD_EXCERPT_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

export function needsExcerptTruncation(text: string, maxLen = REFLECTION_CARD_EXCERPT_MAX): boolean {
  return text.trim().length > maxLen;
}