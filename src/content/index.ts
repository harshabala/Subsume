/**
 * Subsume Content Script Entry Point
 *
 * Scans pages for movie/TV references, attaches hover cards to text
 * detections, and injects rating badges on poster images.
 */

import { scanPage, startObserving, stopObserving, scanImages, setImageScanConfig, DetectedTitle } from './scanner';
import { detectCatalogRegions } from './catalogDetector';
import { HoverCardManager } from './hoverCard';
import { MuseumPlaqueManager as PosterBadgeManager } from './overlay';
import { AuteurScreenplayDock } from './dock';
import { sendMessage } from '@/shared/messages';
import { MessageType, PosterMatch, ContentPrefs } from '@/shared/types';
import { logger } from '@/shared/logger';
import './content.css';

let hoverManagerRef: HoverCardManager | null = null;
let badgeManagerRef: PosterBadgeManager | null = null;
let dockManagerRef: AuteurScreenplayDock | null = null;

function teardownContentScript(): void {
  stopObserving();
  hoverManagerRef?.destroy();
  hoverManagerRef = null;
  badgeManagerRef?.destroy();
  badgeManagerRef = null;
  dockManagerRef?.destroy();
  dockManagerRef = null;
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
  const dockEnabled = prefs?.screenplayDockEnabled ?? false;
  const sensitivity = prefs?.detectionSensitivity || 'medium';

  if (prefs?.domainDisabled) {
    logger.log(`[Subsume] Domain ${hostname} is blacklisted. Exiting.`);
    return;
  }

  if (!hoverEnabled && !overlaysEnabled && !dockEnabled) {
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