import { describe, it, expect, vi, beforeEach } from 'vitest';
import { libraryHandlers } from '@/background/handlers/library';
import { MessageType, MediaItem } from '@/shared/types';
import { putMediaItem, putLibraryItem, getLibraryItem } from '@/background/storage';

vi.mock('@/background/context', () => ({
  invalidateProfileCache: vi.fn(),
}));

vi.mock('@/background/handlers/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/background/handlers/utils')>();
  return {
    ...actual,
    broadcastMessage: vi.fn().mockResolvedValue(undefined),
  };
});

const sender = {} as chrome.runtime.MessageSender;
const mediaId = 'tmdb_movie_9001';

const sampleMedia: MediaItem = {
  id: mediaId,
  canonicalTitle: 'Capture Flow Film',
  type: 'movie',
  year: 2024,
  genres: ['Drama'],
  ratings: [{ provider: 'tmdb', score: 7.5 }],
  providers: [{ provider: 'tmdb', externalId: '9001' }],
  posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
};

describe('capture to library integration flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await putMediaItem(sampleMedia);
    await putLibraryItem({
      mediaId,
      status: 'to-watch',
      sanctuaryIntent: 'wishlist',
      addedAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  it('SET_USER_NOTES with emotionalRecall persists to storage', async () => {
    const handler = libraryHandlers[MessageType.SET_USER_NOTES]!;
    const result = await handler(
      { mediaId, emotionalRecall: 'The score still echoes weeks later' },
      sender
    );

    expect(result).toEqual({ updated: true });

    const stored = await getLibraryItem(mediaId);
    expect(stored?.emotionalRecall).toBe('The score still echoes weeks later');
  });

  it('UPDATE_STATUS syncs sanctuaryIntent with watched status', async () => {
    const handler = libraryHandlers[MessageType.UPDATE_STATUS]!;
    const result = await handler({ mediaId, status: 'watched' }, sender);

    expect(result).toEqual({ updated: true });

    const stored = await getLibraryItem(mediaId);
    expect(stored?.status).toBe('watched');
    expect(stored?.sanctuaryIntent).toBe('keep_memory');
  });

  it('GET_LIBRARY returns joined item with emotionalRecall visible', async () => {
    const notesHandler = libraryHandlers[MessageType.SET_USER_NOTES]!;
    await notesHandler(
      {
        mediaId,
        emotionalRecall: 'Quiet ending that stayed with me',
        notes: 'Watched on a rainy evening',
      },
      sender
    );

    const getHandler = libraryHandlers[MessageType.GET_LIBRARY]!;
    const joined = (await getHandler({}, sender)) as Array<{
      library: { mediaId: string; emotionalRecall?: string };
      media: MediaItem;
    }>;

    const match = joined.find((entry) => entry.library.mediaId === mediaId);
    expect(match).toBeDefined();
    expect(match?.library.emotionalRecall).toBe('Quiet ending that stayed with me');
    expect(match?.media.canonicalTitle).toBe('Capture Flow Film');
  });
});