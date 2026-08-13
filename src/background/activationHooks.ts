/**
 * Shared post-add activation for any path that creates a NEW library item
 * (ADD_TO_LIST, ADD_TO_ARCHIVE, etc.).
 */
import {
  getPreferences,
  savePreferences,
  getAllLibraryItems,
} from './storage';
import { recordInscription } from '@/shared/activationMetrics';
import { logger } from '@/shared/logger';

/** Mark first inscription complete (prefs) + device-only inscription counter. */
export async function onNewLibraryItemCreated(): Promise<void> {
  try {
    const prefs = await getPreferences();
    if (!prefs.firstInscriptionComplete) {
      await savePreferences({ ...prefs, firstInscriptionComplete: true });
    }
  } catch (err) {
    logger.warn('[Subsume] Failed to mark firstInscriptionComplete:', err);
  }
  try {
    await recordInscription();
  } catch (err) {
    logger.warn('[Subsume] Failed to record inscription metrics:', err);
  }
}

/**
 * Upgrade heal: users who already have ≥1 library item from before
 * `firstInscriptionComplete` existed must not stay behind the gate forever.
 * Only real library count matters — not demo media seed without library rows.
 */
export async function healFirstInscriptionIfLibraryNonEmpty(): Promise<boolean> {
  try {
    const prefs = await getPreferences();
    if (prefs.firstInscriptionComplete) {
      return false;
    }
    const items = await getAllLibraryItems();
    if (items.length === 0) {
      return false;
    }
    await savePreferences({ ...prefs, firstInscriptionComplete: true });
    return true;
  } catch (err) {
    logger.warn('[Subsume] healFirstInscriptionIfLibraryNonEmpty failed:', err);
    return false;
  }
}
