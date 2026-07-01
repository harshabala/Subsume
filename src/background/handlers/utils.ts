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
    typeof req.lingeringThought === 'string';
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
