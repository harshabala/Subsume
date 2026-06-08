/**
 * Subsume Content Script Entry Point
 *
 * Scans pages for movie/TV references, attaches hover cards to text
 * detections, and injects rating badges on poster images.
 */

import { scanPage, startObserving, scanImages, setImageScanConfig, DetectedTitle } from './scanner';
import { detectCatalogRegions } from './catalogDetector';
import { HoverCardManager } from './hoverCard';
import { PosterBadgeManager } from './posterBadge';
import { sendMessage } from '@/shared/messages';
import { MessageType, PosterMatch, ContentPrefs } from '@/shared/types';

async function init(): Promise<void> {
  console.log('[Subsume] Content script loaded.');

  const hostname = window.location.hostname;

  const prefsRes = await sendMessage<{ hostname: string }, ContentPrefs>(
    MessageType.GET_CONTENT_PREFS,
    { hostname }
  );

  const prefs = prefsRes.success ? prefsRes.data : null;

  const hoverEnabled = prefs?.hoverCardsEnabled ?? true;
  const overlaysEnabled = prefs?.posterOverlaysEnabled ?? true;
  const sensitivity = prefs?.detectionSensitivity || 'medium';

  if (prefs?.domainDisabled) {
    console.log(`[Subsume] Domain ${hostname} is blacklisted. Exiting.`);
    return;
  }

  if (!hoverEnabled && !overlaysEnabled) {
    console.log('[Subsume] Page scanning disabled in preferences. Exiting.');
    return;
  }

  let hoverManager: HoverCardManager | null = null;
  let badgeManager: PosterBadgeManager | null = null;

  const catalogRegions = detectCatalogRegions(document.body);
  const highConfidenceRegions = catalogRegions.filter((r) => r.confidence === 'high');
  const catalogMode = highConfidenceRegions.length > 0;

  if (overlaysEnabled) {
    badgeManager = new PosterBadgeManager();
    void badgeManager.initLibraryCache();

    const onPosterMatch = (img: HTMLImageElement, match: PosterMatch) => {
      badgeManager?.attachBadge(img, match);
    };

    setImageScanConfig(sensitivity, onPosterMatch, catalogMode);

    const runInitialPosterScan = async (): Promise<void> => {
      if (catalogMode) {
        console.log(
          `[Subsume] Catalog page detected (${highConfidenceRegions.length} region(s)); prioritizing poster scan.`
        );
        for (const region of highConfidenceRegions) {
          await scanImages(sensitivity, onPosterMatch, region.element, { catalogMode: true });
        }
      }

      await scanImages(sensitivity, onPosterMatch, document.body, { catalogMode });
    };

    runInitialPosterScan().catch((err) => {
      console.error('[Subsume] Initial poster scan failed:', err);
    });
  }

  if (hoverEnabled) {
    hoverManager = new HoverCardManager();

    const attachHoverListeners = (titles: DetectedTitle[]): void => {
      for (const detected of titles) {
        hoverManager!.attachToElement(detected.element, detected.title, detected.yearGuess);
      }
    };

    const initialTitles = scanPage();
    if (initialTitles.length > 0) {
      console.log(`[Subsume] Found ${initialTitles.length} title(s) on page.`);
      attachHoverListeners(initialTitles);
    }

    startObserving((newTitles) => {
      console.log(`[Subsume] Found ${newTitles.length} new title(s) via mutation.`);
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