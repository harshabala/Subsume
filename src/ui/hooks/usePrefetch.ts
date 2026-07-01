import { useRef, useEffect } from 'preact/hooks';
import { sendMessage } from '../../shared/messages';
import { MessageType } from '../../shared/types';
import { Page } from '../types';

const PREFETCH_BY_PAGE: Partial<Record<Page, Array<{ type: MessageType; payload?: unknown }>>> = {
  home: [
    { type: MessageType.GET_WEEKLY_DIGEST },
    { type: MessageType.GET_RECOMMENDATIONS },
    { type: MessageType.GET_LIBRARY },
  ],
  library: [{ type: MessageType.GET_LIBRARY }],
  recommendations: [{ type: MessageType.GET_RECOMMENDATIONS }],
  'new-releases': [{ type: MessageType.GET_LATEST_RELEASES, payload: { type: 'movie' } }],
  stats: [{ type: MessageType.GET_LIBRARY }],
  people: [{ type: MessageType.GET_ALL_PEOPLE }],
  alerts: [{ type: MessageType.GET_WATCH_ALERTS }],
};

const prefetchedPages = new Set<Page>();

export function usePrefetch(currentPage: Page) {
  const initialPrefetchDone = useRef(false);

  const prefetchPage = (page: Page) => {
    if (prefetchedPages.has(page)) return;
    const requests = PREFETCH_BY_PAGE[page];
    if (!requests) return;
    prefetchedPages.add(page);
    for (const req of requests) {
      sendMessage(req.type, req.payload ?? {}).catch((err) => console.error('[Subsume] Prefetch failed:', err));
    }
  };

  useEffect(() => {
    if (!initialPrefetchDone.current) {
      initialPrefetchDone.current = true;
      prefetchPage(currentPage);
    }
  }, [currentPage]);

  return { prefetchPage };
}
