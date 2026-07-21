/**
 * Subsume Content Script Entry Point
 *
 * Scans pages for movie/TV references, attaches hover cards to text
 * detections, and injects rating badges on poster images.
 */

import { scanPage, startObserving, stopObserving, scanImages, setImageScanConfig, DetectedTitle } from './scanner';
import { detectCatalogRegions } from './catalogDetector';
import { detectBookCandidates, HIGH_CONFIDENCE } from './bookDetection';
import { HoverCardManager } from './hoverCard';
import { MuseumPlaqueManager as PosterBadgeManager } from './overlay';
import { BookPlaqueManager, findBookPlaqueAnchor } from './bookOverlay';
import { AuteurScreenplayDock } from './dock';
import { sendMessage } from '@/shared/messages';
import { MessageType, PosterMatch, ContentPrefs, type MediaItem } from '@/shared/types';
import type { DetectionCandidate } from '@/shared/catalogTypes';
import { logger } from '@/shared/logger';
import './content.css';

/** Consider at most this many high-confidence book candidates for plaques. */
const MAX_BOOK_PLAQUE_CANDIDATES = 8;
/** Cap Open Library / catalog resolves per page load. */
const MAX_BOOK_RESOLVE_CALLS = 5;

let hoverManagerRef: HoverCardManager | null = null;
let badgeManagerRef: PosterBadgeManager | null = null;
let bookPlaqueManagerRef: BookPlaqueManager | null = null;
let dockManagerRef: AuteurScreenplayDock | null = null;

function teardownContentScript(): void {
  stopObserving();
  hoverManagerRef?.destroy();
  hoverManagerRef = null;
  badgeManagerRef?.destroy();
  badgeManagerRef = null;
  bookPlaqueManagerRef?.destroy();
  bookPlaqueManagerRef = null;
  dockManagerRef?.destroy();
  dockManagerRef = null;
}

type ResolvePageCandidateResult =
  | {
      resolved: true;
      media: MediaItem;
      inLibrary?: boolean;
      libraryStatus?: string;
    }
  | { resolved: false; reason?: string };

/**
 * Resolve high-confidence book candidates and attach sanctuary plaques.
 * Mid-band confidence (0.65–0.84) is intentionally skipped (no auto-plaque).
 * Only minimal DetectionCandidate fields are sent — never full page HTML.
 */
async function resolveAndAttachBookPlaques(
  candidates: DetectionCandidate[],
  manager: BookPlaqueManager
): Promise<void> {
  const high = candidates
    .filter((c) => c.confidence >= HIGH_CONFIDENCE)
    .slice(0, MAX_BOOK_PLAQUE_CANDIDATES)
    .slice(0, MAX_BOOK_RESOLVE_CALLS);

  for (const candidate of high) {
    try {
      const res = await sendMessage<DetectionCandidate, ResolvePageCandidateResult>(
        MessageType.RESOLVE_PAGE_CANDIDATE,
        candidate
      );
      if (!res.success || !res.data || !res.data.resolved || !res.data.media) {
        continue;
      }
      const { media, inLibrary, libraryStatus } = res.data;
      const anchor = findBookPlaqueAnchor(candidate) ?? document.documentElement;
      manager.attachNear(anchor, {
        mediaId: media.id,
        title: media.canonicalTitle || candidate.title || 'Untitled',
        authors: media.authors ?? candidate.authorOrCreator,
        year: media.year ?? candidate.year,
        inLibrary: Boolean(inLibrary),
        status: libraryStatus,
        media,
      });
    } catch (err) {
      logger.warn('[Subsume] Book candidate resolve skipped:', err);
    }
  }
}

async function init(): Promise<void> {
  teardownContentScript();

  logger.log('[Subsume] Content script loaded.');

  const hostname = window.location.hostname;

  const prefsRes = await sendMessage<{ hostname: string }, ContentPrefs>(
    MessageType.GET_CONTENT_PREFS,
    { hostname }
  );

  const prefs = prefsRes.success ? prefsRes.data : null;

  // Default discovery features on; only disable when prefs explicitly say so.
  const hoverEnabled = prefs?.hoverCardsEnabled ?? true;
  const overlaysEnabled = prefs?.posterOverlaysEnabled ?? true;
  const coverOverlaysEnabled = prefs?.coverOverlaysEnabled ?? true;
  const dockEnabled = prefs?.screenplayDockEnabled ?? false;
  const sensitivity = prefs?.detectionSensitivity || 'medium';

  if (prefs?.domainDisabled) {
    logger.log(`[Subsume] Domain ${hostname} is blacklisted. Exiting.`);
    return;
  }

  // Book detection on arbitrary pages (JSON-LD, ISBN, adapters, heuristics).
  // High confidence (≥0.85) only: resolve + plaque when cover overlays on.
  // Mid-band (0.65–0.84) is detected but not auto-plaqued (precision first).
  const detectBooksEnabled = prefs?.detectBooks !== false;
  if (detectBooksEnabled) {
    try {
      const bookCandidates = detectBookCandidates(document, new URL(window.location.href));
      logger.log(`[Subsume] Book detection found ${bookCandidates.length} candidate(s).`);
      if (coverOverlaysEnabled) {
        bookPlaqueManagerRef = new BookPlaqueManager();
        void resolveAndAttachBookPlaques(bookCandidates, bookPlaqueManagerRef);
      }
    } catch (err) {
      logger.error('[Subsume] Book detection failed:', err);
    }
  }

  if (!hoverEnabled && !overlaysEnabled && !dockEnabled && !coverOverlaysEnabled) {
    logger.log('[Subsume] Page scanning and dock disabled in preferences. Exiting.');
    return;
  }

  if (dockEnabled) {
    dockManagerRef = new AuteurScreenplayDock();
    dockManagerRef.mount();
  }

  const catalogRegions = detectCatalogRegions(document.body);
  const highConfidenceRegions = catalogRegions.filter((r) => r.confidence === 'high');
  const catalogMode = highConfidenceRegions.length > 0;

  if (overlaysEnabled) {
    badgeManagerRef = new PosterBadgeManager();

    const onPosterMatch = (img: HTMLImageElement, match: PosterMatch) => {
      badgeManagerRef?.attachBadge(img, match);
    };

    setImageScanConfig(sensitivity, onPosterMatch, catalogMode);

    const runInitialPosterScan = async (): Promise<void> => {
      if (catalogMode) {
        logger.log(
          `[Subsume] Catalog page detected (${highConfidenceRegions.length} region(s)); prioritizing poster scan.`
        );
        for (const region of highConfidenceRegions) {
          await scanImages(sensitivity, onPosterMatch, region.element, { catalogMode: true });
        }
      }

      await scanImages(sensitivity, onPosterMatch, document.body, { catalogMode });
    };

    runInitialPosterScan().catch((err) => {
      logger.error('[Subsume] Initial poster scan failed:', err);
    });
  }

  if (hoverEnabled) {
    hoverManagerRef = new HoverCardManager();

    const attachHoverListeners = (titles: DetectedTitle[]): void => {
      for (const detected of titles) {
        hoverManagerRef!.attachToElement(detected.element, detected.title, detected.yearGuess);
      }
    };

    const initialTitles = scanPage();
    if (initialTitles.length > 0) {
      logger.log(`[Subsume] Found ${initialTitles.length} title(s) on page.`);
      attachHoverListeners(initialTitles);
    }

    startObserving((newTitles) => {
      logger.log(`[Subsume] Found ${newTitles.length} new title(s) via mutation.`);
      attachHoverListeners(newTitles);
    });
  } else if (overlaysEnabled) {
    startObserving(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('pagehide', teardownContentScript);