import { logger } from '@/shared/logger';
import {
  BroadcastMessage,
  LibraryStatus,
  SetUserNotesRequest,
  UpdateStatusRequest,
} from '@/shared/types';

const VALID_LIBRARY_STATUSES = new Set<LibraryStatus>([
  'to-watch',
  'watching',
  'watched',
  'abandoned',
]);

function parseEmotionalMetric(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 100) return null;
  return rounded;
}

export function parseUpdateStatusRequest(payload: unknown): UpdateStatusRequest | null {
  if (!payload || typeof payload !== 'object') return null;
  const req = payload as Record<string, unknown>;
  if (typeof req.mediaId !== 'string' || !req.mediaId) return null;
  if (typeof req.status !== 'string' || !VALID_LIBRARY_STATUSES.has(req.status as LibraryStatus)) {
    return null;
  }
  return { mediaId: req.mediaId, status: req.status as LibraryStatus };
}

export function parseSetUserNotesRequest(payload: unknown): SetUserNotesRequest | null {
  if (!payload || typeof payload !== 'object') return null;
  const req = payload as Record<string, unknown>;
  if (typeof req.mediaId !== 'string' || !req.mediaId) return null;

  const hasNoteField =
    typeof req.notes === 'string' ||
    typeof req.emotionalRecall === 'string' ||
    typeof req.atmosphere === 'string' ||
    typeof req.lingeringThought === 'string' ||
    typeof req.awe === 'number' ||
    typeof req.melancholy === 'number' ||
    typeof req.tension === 'number' ||
    typeof req.warmth === 'number';
  if (!hasNoteField) return null;

  const result: SetUserNotesRequest = {
    mediaId: req.mediaId,
    notes: typeof req.notes === 'string' ? req.notes : '',
  };

  if (req.emotionalRecall !== undefined) {
    if (typeof req.emotionalRecall !== 'string') return null;
    result.emotionalRecall = req.emotionalRecall;
  }
  if (req.atmosphere !== undefined) {
    if (typeof req.atmosphere !== 'string') return null;
    result.atmosphere = req.atmosphere;
  }
  if (req.lingeringThought !== undefined) {
    if (typeof req.lingeringThought !== 'string') return null;
    result.lingeringThought = req.lingeringThought;
  }
  if (req.awe !== undefined) {
    const awe = parseEmotionalMetric(req.awe);
    if (awe === null) return null;
    result.awe = awe;
  }
  if (req.melancholy !== undefined) {
    const melancholy = parseEmotionalMetric(req.melancholy);
    if (melancholy === null) return null;
    result.melancholy = melancholy;
  }
  if (req.tension !== undefined) {
    const tension = parseEmotionalMetric(req.tension);
    if (tension === null) return null;
    result.tension = tension;
  }
  if (req.warmth !== undefined) {
    const warmth = parseEmotionalMetric(req.warmth);
    if (warmth === null) return null;
    result.warmth = warmth;
  }

  return result;
}

export async function broadcastMessage(message: BroadcastMessage) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('[Subsume] Failed to query tabs for broadcast:', err);
  }
}
