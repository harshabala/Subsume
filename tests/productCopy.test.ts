import { h } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Onboarding } from '@/ui/pages/Onboarding';
import { FirstInscriptionGate } from '@/ui/components/FirstInscriptionGate';
import {
  FIRST_SESSION_COPY,
  FIRST_SESSION_HEADLINE,
  FIRST_SESSION_PITCH,
  FIRST_SESSION_POETRY_SUBTEXT,
  FIRST_SESSION_PILLARS,
  FIRST_SESSION_MINUTE_NOTE,
  ONBOARDING_BEGIN_LABEL,
  ONBOARDING_STEP2_HEADLINE,
  ONBOARDING_STEP2_SKIP_LABEL,
  ONBOARDING_STEP2_VALIDATE_LABEL,
  FIRST_REFLECTION_HEADLINE,
  FIRST_REFLECTION_BODY,
  FIRST_GATE_SEARCH_CTA,
  FIRST_GATE_PRACTICE_CTA,
  FIRST_GATE_SKIP_CTA,
  POPUP_TAGLINE,
  POPUP_PRIMARY_CTA,
  POPUP_OPEN_JOURNAL_CTA,
  POPUP_SEARCH_HEADER,
  POPUP_SEARCH_TAGLINE,
  POPUP_SEARCH_PROMPT,
  POPUP_SEARCH_ARIA_LABEL,
  POPUP_SEARCHING_PROMPT,
  POPUP_RECENT_ENTRIES_LABEL,
  POPUP_EMPTY_PITCH,
  POPUP_EMPTY_FLAVOR,
  POPUP_LOAD_SAMPLE_CTA,
  EMPTY_HOME_HERO_TITLE,
  EMPTY_HOME_HERO_PROMPT,
  EMPTY_HOME_HERO_QUOTE,
  DISCOVERY_FIRST_BANNER_TITLE,
  DISCOVERY_FIRST_BANNER_BODY,
  mediumLabel,
  MEDIUM_LABEL,
  PLAIN_ENGLISH_PITCH,
  WEEKLY_SELECTION_LABEL,
  ADD_TO_ARCHIVE_LABEL,
  IN_ARCHIVE_LABEL,
  REMOVE_FROM_ARCHIVE_LABEL,
  ADD_SERIES_TO_ARCHIVE_LABEL,
  FILMS_TAB_LABEL,
  SERIES_TAB_LABEL,
  NOW_SHOWING_TITLE,
  PREMIERE_ALERTS_TITLE,
  LIVE_FEED_LABEL,
  TRY_AGAIN_LABEL,
  CREATORS_LABEL,
  EDITIONS_SECTION_TITLE,
  USE_AS_PREFERRED_EDITION_LABEL,
  PREFERRED_EDITION_BADGE,
  EDITIONS_SHARE_ARCHIVE_NOTE,
  STATS_BOOK_SECTION_TITLE,
  STATS_BOOK_FINISHED_LABEL,
  STATS_BOOK_READING_LABEL,
  STATS_BOOK_ABANDONED_LABEL,
  STATS_BOOK_PAGES_LABEL,
  STATS_BOOK_PAGES_PARTIAL_NOTE,
  failedToAddToArchiveMessage,
  failedToRemoveFromArchiveMessage,
  ARCHIVE_UPDATE_ERROR,
  EXPORT_KEEP_FILE_NOTICE,
  BACKUP_SECTION_PITCH,
} from '@/shared/productCopy';
import { legacyStatusLabel } from '@/shared/statusLabels';
import { INTENT_LABELS_V2 } from '@/shared/statusLabels';

describe('productCopy lexicon', () => {
  it('exports plain-English pitch and weekly selection label', () => {
    expect(PLAIN_ENGLISH_PITCH).toMatch(/private movie & book journal/i);
    expect(PLAIN_ENGLISH_PITCH).toMatch(/save what stayed with you/i);
    expect(WEEKLY_SELECTION_LABEL).toBe('Weekly selection');
    expect(WEEKLY_SELECTION_LABEL.toLowerCase()).not.toContain('dispatch');
  });

  it('uses Film | Series | Book for medium badges', () => {
    expect(mediumLabel('movie')).toBe('Film');
    expect(mediumLabel('tv')).toBe('Series');
    expect(mediumLabel('book')).toBe('Book');
    expect(MEDIUM_LABEL.movie).toBe('Film');
    expect(MEDIUM_LABEL.tv).toBe('Series');
    expect(MEDIUM_LABEL.book).toBe('Book');
  });

  it('uses archive vocabulary for keep actions', () => {
    expect(ADD_TO_ARCHIVE_LABEL).toBe('Add to archive');
    expect(IN_ARCHIVE_LABEL).toBe('In archive');
    expect(REMOVE_FROM_ARCHIVE_LABEL).toBe('Remove from archive');
    expect(ADD_SERIES_TO_ARCHIVE_LABEL).toBe('Add series to archive');
  });

  it('uses Films / Series operational tab labels', () => {
    expect(FILMS_TAB_LABEL).toBe('Films');
    expect(SERIES_TAB_LABEL).toBe('Series');
  });

  it('uses canonical page and feed labels', () => {
    expect(NOW_SHOWING_TITLE).toBe('Now Showing');
    expect(PREMIERE_ALERTS_TITLE).toBe('Premiere Alerts');
    expect(LIVE_FEED_LABEL).toBe('Live feed');
    expect(TRY_AGAIN_LABEL).toBe('Try again');
    expect(CREATORS_LABEL).toBe('Creators');
  });

  it('edition reconciliation copy marks preferred without multi-work merge', () => {
    expect(EDITIONS_SECTION_TITLE).toBe('Editions');
    expect(USE_AS_PREFERRED_EDITION_LABEL).toBe('Use as preferred');
    expect(PREFERRED_EDITION_BADGE).toBe('Preferred');
    expect(EDITIONS_SHARE_ARCHIVE_NOTE).toMatch(/archive relationship/i);
    expect(EDITIONS_SHARE_ARCHIVE_NOTE).toMatch(/does not merge/i);
  });

  it('stats book reading copy stays literary (not To Watch / DNF jargon)', () => {
    expect(STATS_BOOK_SECTION_TITLE).toBe('On the page');
    expect(STATS_BOOK_FINISHED_LABEL).toBe('finished');
    expect(STATS_BOOK_READING_LABEL).toBe('currently reading');
    expect(STATS_BOOK_ABANDONED_LABEL).toBe('did not finish');
    expect(STATS_BOOK_PAGES_LABEL).toMatch(/pages/i);
    expect(STATS_BOOK_PAGES_PARTIAL_NOTE).toMatch(/page totals/i);
    expect(STATS_BOOK_ABANDONED_LABEL).not.toMatch(/stopped|to watch/i);
  });

  it('error helpers say archive not library', () => {
    expect(failedToAddToArchiveMessage()).toBe('Failed to add title to your archive.');
    expect(failedToAddToArchiveMessage('Network down')).toBe('Network down');
    expect(failedToRemoveFromArchiveMessage()).toBe('Failed to remove item from archive.');
    expect(failedToAddToArchiveMessage()).not.toMatch(/library/i);
    expect(failedToRemoveFromArchiveMessage()).not.toMatch(/library/i);
  });

  it('content-script archive failure and product pitch constants', () => {
    expect(ARCHIVE_UPDATE_ERROR).toBe('Could not update archive. Try again.');
    expect(PLAIN_ENGLISH_PITCH).toMatch(/Private movie & book journal/i);
    expect(EXPORT_KEEP_FILE_NOTICE).toMatch(/only full copy/i);
    expect(BACKUP_SECTION_PITCH).toBe(
      'Free forever on this device. Optional private backup (coming) — never sells your data.',
    );
    expect(BACKUP_SECTION_PITCH).toMatch(/never sells/i);
    expect(BACKUP_SECTION_PITCH).toMatch(/Free forever on this device/i);
  });

  it('book status labels stay book-aware (not To Watch)', () => {
    expect(legacyStatusLabel('to-watch', 'book')).toBe('Want to read');
    expect(legacyStatusLabel('watching', 'book')).toBe('Reading');
    expect(legacyStatusLabel('watched', 'book')).toBe('Read');
    expect(legacyStatusLabel('abandoned', 'book')).toBe('Did not finish');
  });

  it('intent V2 uses Return Soon', () => {
    expect(INTENT_LABELS_V2.return_soon).toBe('Return Soon');
  });
});

describe('first-session plain-English layering (first 60 seconds)', () => {
  const JARGON_TOKEN_REGEX =
    /\b(inscribe|inscribed|inscribing|inscription|inscriptions|plaque|plaques|sanctuary)\b/i;
  const SUBSUME_AS_VERB_REGEX = /\b(subsume|subsumed|subsuming)\b/i;

  it('centralizes first-session headlines and primary CTAs without house jargon', () => {
    const primaryHeadlines = [
      FIRST_SESSION_HEADLINE,
      FIRST_REFLECTION_HEADLINE,
      ONBOARDING_STEP2_HEADLINE,
      DISCOVERY_FIRST_BANNER_TITLE,
      EMPTY_HOME_HERO_TITLE,
      POPUP_SEARCH_HEADER,
      POPUP_RECENT_ENTRIES_LABEL,
    ];

    for (const text of primaryHeadlines) {
      expect(text).not.toMatch(JARGON_TOKEN_REGEX);
      expect(text).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }

    const primaryCtas = [
      ONBOARDING_BEGIN_LABEL,
      ONBOARDING_STEP2_VALIDATE_LABEL,
      ONBOARDING_STEP2_SKIP_LABEL,
      FIRST_GATE_SEARCH_CTA,
      FIRST_GATE_PRACTICE_CTA,
      FIRST_GATE_SKIP_CTA,
      POPUP_PRIMARY_CTA,
      POPUP_OPEN_JOURNAL_CTA,
      POPUP_LOAD_SAMPLE_CTA,
    ];

    for (const text of primaryCtas) {
      expect(text).not.toMatch(JARGON_TOKEN_REGEX);
      expect(text).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }

    // Verify FIRST_SESSION_COPY matches the individual exports
    expect(FIRST_SESSION_COPY.headline).toBe(FIRST_SESSION_HEADLINE);
    expect(FIRST_SESSION_COPY.firstReflectionHeadline).toBe(FIRST_REFLECTION_HEADLINE);
    expect(FIRST_SESSION_COPY.firstGateSearch).toBe(FIRST_GATE_SEARCH_CTA);
    expect(FIRST_SESSION_COPY.firstGatePractice).toBe(FIRST_GATE_PRACTICE_CTA);
    expect(FIRST_SESSION_COPY.popupTagline).toBe(POPUP_TAGLINE);
    expect(FIRST_SESSION_COPY.popupPrimaryCta).toBe(POPUP_PRIMARY_CTA);
  });

  it('meets stranger comprehension: popup title, onboarding headline, and gate CTA immediately explain product', () => {
    // Acceptance: A stranger reading only the popup title, onboarding headline, and first-inscription CTA
    // — with zero other context — understands this is a private movie/book journal within one sentence.
    expect(POPUP_TAGLINE.toLowerCase()).toContain('private movie & book journal');
    expect(FIRST_SESSION_HEADLINE.toLowerCase()).toContain('private movie & book journal');
    expect(FIRST_REFLECTION_HEADLINE).toBe('Save your first reflection');
    expect(FIRST_GATE_SEARCH_CTA).toBe('Search for a title');
    expect(FIRST_GATE_PRACTICE_CTA).toBe('Start with a practice title');
  });

  it('asserts Onboarding.tsx step 1 and step 2 primary headlines and CTAs contain no house jargon', () => {
    const { container, unmount } = render(h(Onboarding, { onComplete: vi.fn() }));

    // Check step 1 headings and buttons
    const headingsStep1 = Array.from(
      container.querySelectorAll('h1, h2, h3, [role="heading"]'),
    ).map((el) => el.textContent || '');
    const buttonsStep1 = Array.from(
      container.querySelectorAll('button, [role="button"]'),
    ).map((el) => el.textContent || '');

    expect(headingsStep1.length).toBeGreaterThan(0);
    expect(buttonsStep1.length).toBeGreaterThan(0);

    for (const heading of headingsStep1) {
      expect(heading).not.toMatch(JARGON_TOKEN_REGEX);
      expect(heading).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }
    for (const btn of buttonsStep1) {
      expect(btn).not.toMatch(JARGON_TOKEN_REGEX);
      expect(btn).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }

    // Go to step 2
    const beginButton = screen.getByRole('button', { name: /begin/i });
    fireEvent.click(beginButton);

    const headingsStep2 = Array.from(
      container.querySelectorAll('h1, h2, h3, [role="heading"]'),
    ).map((el) => el.textContent || '');
    const buttonsStep2 = Array.from(
      container.querySelectorAll('button, [role="button"]'),
    ).map((el) => el.textContent || '');

    expect(headingsStep2.length).toBeGreaterThan(0);
    expect(buttonsStep2.length).toBeGreaterThan(0);

    for (const heading of headingsStep2) {
      expect(heading).not.toMatch(JARGON_TOKEN_REGEX);
      expect(heading).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }
    for (const btn of buttonsStep2) {
      expect(btn).not.toMatch(JARGON_TOKEN_REGEX);
      expect(btn).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }

    unmount();
  });

  it('asserts FirstInscriptionGate.tsx primary headlines and primary CTAs contain no house jargon', () => {
    const { container, unmount } = render(
      h(FirstInscriptionGate, {
        onNavigate: vi.fn(),
        onSkipLater: vi.fn(),
        onPracticeTitle: vi.fn(),
      }),
    );

    const headings = Array.from(
      container.querySelectorAll('h1, h2, h3, [role="heading"]'),
    ).map((el) => el.textContent || '');
    const buttons = Array.from(
      container.querySelectorAll('button, [role="button"]'),
    ).map((el) => el.textContent || '');

    expect(headings.length).toBeGreaterThan(0);
    expect(buttons.length).toBeGreaterThan(0);

    for (const heading of headings) {
      expect(heading).not.toMatch(JARGON_TOKEN_REGEX);
      expect(heading).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }
    for (const btn of buttons) {
      expect(btn).not.toMatch(JARGON_TOKEN_REGEX);
      expect(btn).not.toMatch(SUBSUME_AS_VERB_REGEX);
    }

    unmount();
  });
});

