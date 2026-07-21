import { sendMessage } from '@/shared/messages';
import { MessageType, LibraryItem, MediaItem } from '@/shared/types';

export interface JoinedLibraryItem {
  library: LibraryItem;
  media: MediaItem;
}

/**
 * Loads the current library. Does **not** auto-seed demo titles.
 *
 * Demo restoration is opt-in only (Settings / popup “Restore demo library”).
 * Silent auto-seed blurred ownership on first open; keep that path explicit.
 */
export async function ensureDemoLibraryIfEmpty(): Promise<JoinedLibraryItem[]> {
  const initial = await sendMessage<Record<string, unknown>, JoinedLibraryItem[]>(
    MessageType.GET_LIBRARY,
    {}
  );
  return initial.data ?? [];
}

/**
 * Explicit opt-in: restore the demo sanctuary library.
 * Prefer calling this only from a user-initiated control.
 */
export async function restoreDemoLibrary(): Promise<JoinedLibraryItem[]> {
  await sendMessage(MessageType.RESTORE_DEMO_LIBRARY, {});
  const refreshed = await sendMessage<Record<string, unknown>, JoinedLibraryItem[]>(
    MessageType.GET_LIBRARY,
    {}
  );
  return refreshed.data ?? [];
}
