import { sendMessage } from '@/shared/messages';
import { MessageType, LibraryItem, MediaItem } from '@/shared/types';

export interface JoinedLibraryItem {
  library: LibraryItem;
  media: MediaItem;
}

/**
 * Seeds the demo sanctuary when the library is empty (first install / cleared data).
 * Returns the current library after any seed attempt.
 */
export async function ensureDemoLibraryIfEmpty(): Promise<JoinedLibraryItem[]> {
  const initial = await sendMessage<Record<string, unknown>, JoinedLibraryItem[]>(
    MessageType.GET_LIBRARY,
    {}
  );
  const items = initial.data ?? [];
  if (items.length > 0) return items;

  try {
    await sendMessage(MessageType.RESTORE_DEMO_LIBRARY, {});
    const refreshed = await sendMessage<Record<string, unknown>, JoinedLibraryItem[]>(
      MessageType.GET_LIBRARY,
      {}
    );
    return refreshed.data ?? [];
  } catch {
    return items;
  }
}