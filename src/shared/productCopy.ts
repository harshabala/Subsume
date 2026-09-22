import type { MediaType } from './types';
import type { WorkMedium } from './catalogTypes';

/** Plain-English product pitch (onboarding, Settings Start here, CWS). Poetry is secondary. */
export const PLAIN_ENGLISH_PITCH =
  'Private movie & book journal for Chrome. Save what stayed with you while you browse.';

/** First-session copy: headlines, primary CTAs, and prompts before the user's first save */
export const FIRST_SESSION_HEADLINE = 'Private movie & book journal for Chrome.';
export const FIRST_SESSION_PITCH =
  'Save what stayed with you while you browse. Films, shows, and books — captured on this device, not a spreadsheet or someone else’s cloud.';
export const FIRST_SESSION_POETRY_SUBTEXT =
  'Your private picture palace: afterglow and memory matter more than any algorithm’s tally.';

export const FIRST_SESSION_PILLARS = [
  {
    label: 'Discover',
    description:
      'Quiet overlays on the pages you browse — screen and page — without breaking your flow.',
  },
  {
    label: 'Capture',
    description:
      'A quiet canvas asks what stayed with you. Resonance before metadata, always.',
  },
  {
    label: 'Archive',
    description:
      'An editorial ledger of screen and books, arranged by intent, not date filed.',
  },
] as const;

export const FIRST_SESSION_MINUTE_NOTE =
  'You can save your first reflection in under a minute. Optional catalogue keys (TMDb) can wait until you want richer posters and search.';

export const ONBOARDING_BEGIN_LABEL = 'Begin';
export const ONBOARDING_STEP2_HEADLINE = 'Optional catalogue key';
export const ONBOARDING_STEP2_SKIP_LABEL = 'Enter without keys';
export const ONBOARDING_STEP2_VALIDATE_LABEL = 'Validate & enter';

export const FIRST_REFLECTION_HEADLINE = 'Save your first reflection';
export const FIRST_REFLECTION_BODY =
  'Private movie & book journal. Save your first reflection — search a title you care about and write what stayed with you. Everything stays on this device.';

export const FIRST_GATE_SEARCH_CTA = 'Search for a title';
export const FIRST_GATE_PRACTICE_CTA = 'Start with a practice title';
export const FIRST_GATE_SKIP_CTA = "I'll do this later";

export const POPUP_TAGLINE = 'Private movie & book journal';
export const POPUP_PRIMARY_CTA = 'Save a reflection';
export const POPUP_OPEN_JOURNAL_CTA = 'Open journal';
export const POPUP_SEARCH_HEADER = 'Save a reflection';
export const POPUP_SEARCH_TAGLINE = 'From this page or search';
export const POPUP_SEARCH_PROMPT = 'Search for a film, series, or book...';
export const POPUP_SEARCH_ARIA_LABEL = 'Search titles to save';
export const POPUP_SEARCHING_PROMPT = 'Searching titles…';
export const POPUP_RECENT_ENTRIES_LABEL = 'Recent entries';
export const POPUP_EMPTY_PITCH =
  'Your archive is empty. Search a title and save what stayed with you — a private movie & book journal on this device.';
export const POPUP_EMPTY_FLAVOR = 'Your first entry is ready to be saved.';
export const POPUP_LOAD_SAMPLE_CTA = 'Load sample entries';

export const EMPTY_HOME_HERO_TITLE = 'Your journal awaits';
export const EMPTY_HOME_HERO_PROMPT = 'Add a film or book to your journal';
export const EMPTY_HOME_HERO_QUOTE =
  'Browse the live feed below or search to save your first reflection.';

export const DISCOVERY_FIRST_BANNER_TITLE = 'Save your first reflection';
export const DISCOVERY_FIRST_BANNER_BODY =
  'Private movie & book journal — search a title you care about and write what stayed with you. That first reflection is the whole loop. Everything stays on this device.';

export const FIRST_SESSION_COPY = {
  headline: FIRST_SESSION_HEADLINE,
  pitch: FIRST_SESSION_PITCH,
  poetrySubtext: FIRST_SESSION_POETRY_SUBTEXT,
  pillars: FIRST_SESSION_PILLARS,
  minuteNote: FIRST_SESSION_MINUTE_NOTE,
  onboardingBegin: ONBOARDING_BEGIN_LABEL,
  onboardingStep2Headline: ONBOARDING_STEP2_HEADLINE,
  onboardingStep2Skip: ONBOARDING_STEP2_SKIP_LABEL,
  onboardingStep2Validate: ONBOARDING_STEP2_VALIDATE_LABEL,
  firstReflectionHeadline: FIRST_REFLECTION_HEADLINE,
  firstReflectionBody: FIRST_REFLECTION_BODY,
  firstGateSearch: FIRST_GATE_SEARCH_CTA,
  firstGatePractice: FIRST_GATE_PRACTICE_CTA,
  firstGateSkip: FIRST_GATE_SKIP_CTA,
  popupTagline: POPUP_TAGLINE,
  popupPrimaryCta: POPUP_PRIMARY_CTA,
  popupOpenJournalCta: POPUP_OPEN_JOURNAL_CTA,
  popupSearchHeader: POPUP_SEARCH_HEADER,
  popupSearchTagline: POPUP_SEARCH_TAGLINE,
  popupSearchPrompt: POPUP_SEARCH_PROMPT,
  popupSearchAriaLabel: POPUP_SEARCH_ARIA_LABEL,
  popupSearchingPrompt: POPUP_SEARCHING_PROMPT,
  popupRecentEntries: POPUP_RECENT_ENTRIES_LABEL,
  popupEmptyPitch: POPUP_EMPTY_PITCH,
  popupEmptyFlavor: POPUP_EMPTY_FLAVOR,
  popupLoadSampleCta: POPUP_LOAD_SAMPLE_CTA,
  emptyHomeHeroTitle: EMPTY_HOME_HERO_TITLE,
  emptyHomeHeroPrompt: EMPTY_HOME_HERO_PROMPT,
  emptyHomeHeroQuote: EMPTY_HOME_HERO_QUOTE,
  discoveryFirstBannerTitle: DISCOVERY_FIRST_BANNER_TITLE,
  discoveryFirstBannerBody: DISCOVERY_FIRST_BANNER_BODY,
};

/** User-facing name for free weekly local picks (never “Dispatch”). */
export const WEEKLY_SELECTION_LABEL = 'Weekly selection';

/** Canonical medium labels for user-facing badges and meta */
export const MEDIUM_LABEL: Record<WorkMedium | MediaType | 'movie' | 'tv' | 'book', string> = {
  movie: 'Film',
  tv: 'Series',
  book: 'Book',
};

/** Primary keep action — empty archive CTA */
export const ADD_TO_ARCHIVE_LABEL = 'Add to archive';

/** Primary keep action — already in archive */
export const IN_ARCHIVE_LABEL = 'In archive';

/** Primary keep action — remove from archive */
export const REMOVE_FROM_ARCHIVE_LABEL = 'Remove from archive';

/** Hover / dual-type add for series when type is ambiguous */
export const ADD_SERIES_TO_ARCHIVE_LABEL = 'Add series to archive';

/** Screen sub-tab under Screen medium filter */
export const FILMS_TAB_LABEL = 'Films';

/** Series sub-tab / medium filter */
export const SERIES_TAB_LABEL = 'Series';

/** Now Showing page / nav label */
export const NOW_SHOWING_TITLE = 'Now Showing';

/** Premiere Alerts page title */
export const PREMIERE_ALERTS_TITLE = 'Premiere Alerts';

/** Discovery live feed heading */
export const LIVE_FEED_LABEL = 'Live feed';

/** Generic retry CTA */
export const TRY_AGAIN_LABEL = 'Try again';

/** Creators registry (people) operational label */
export const CREATORS_LABEL = 'Creators';

/** Book dossier: preferred-edition section heading */
export const EDITIONS_SECTION_TITLE = 'Editions';

/** CTA on a non-preferred edition row */
export const USE_AS_PREFERRED_EDITION_LABEL = 'Use as preferred';

/** Badge when this edition is the preferred printing */
export const PREFERRED_EDITION_BADGE = 'Preferred';

/**
 * Honesty copy: editions under one work share archive state;
 * preferred edition is not a multi-work merge.
 */
export const EDITIONS_SHARE_ARCHIVE_NOTE =
  'Editions of this work share one archive relationship (status, notes, and verdict). “Use as preferred” marks the printing you mean — it does not merge separate catalog works.';

/** Stats page — book reading section title (literary tone). */
export const STATS_BOOK_SECTION_TITLE = 'On the page';

/** Stats labels for book reading buckets */
export const STATS_BOOK_FINISHED_LABEL = 'finished';
export const STATS_BOOK_READING_LABEL = 'currently reading';
export const STATS_BOOK_ABANDONED_LABEL = 'did not finish';
export const STATS_BOOK_PAGES_LABEL = 'pages among them';

/** Stats footnote when page totals are partial */
export const STATS_BOOK_PAGES_PARTIAL_NOTE =
  'Page totals appear when an edition or progress records them — not every volume carries a count.';

export function mediumLabel(type: WorkMedium | MediaType | 'movie' | 'tv' | 'book' | string): string {
  if (type === 'book') return MEDIUM_LABEL.book;
  if (type === 'tv') return MEDIUM_LABEL.tv;
  if (type === 'movie') return MEDIUM_LABEL.movie;
  return MEDIUM_LABEL.movie;
}

/** User-facing error when an add-to-archive action fails */
export function failedToAddToArchiveMessage(detail?: string): string {
  if (detail?.trim()) return detail.trim();
  return 'Failed to add title to your archive.';
}

/** User-facing error when a remove-from-archive action fails */
export function failedToRemoveFromArchiveMessage(detail?: string): string {
  if (detail?.trim()) return detail.trim();
  return 'Failed to remove item from archive.';
}

/**
 * Content-script hover card / plaque: archive add or remove failed.
 * Shown with role="alert" for ~3s so failures are never silent.
 */
export const ARCHIVE_UPDATE_ERROR = 'Could not update archive. Try again.';

/** After successful library export — stickiness / sole off-device copy. */
export const EXPORT_KEEP_FILE_NOTICE =
  "Keep this file — it's the only full copy of your sanctuary off this device.";

/** Settings Backup & sync section honesty line. */
export const BACKUP_SECTION_PITCH =
  'Free forever on this device. Optional private backup (coming) — never sells your data.';
