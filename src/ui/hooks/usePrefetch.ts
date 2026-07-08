import { sendMessage } from '../../shared/messages';
import { MessageType } from '../../shared/types';

export type Page =
  | 'home'
  | 'library'
  | 'search'
  | 'people'
  | 'stats'
  | 'recommendations'
  | 'new-releases'
  | 'alerts'
  | 'settings';

type PrefetchRequest = { type: MessageType; payload?: unknown };

const PREFETCH_BY_PAGE: Partial<Record<Page, PrefetchRequest[]>> = {
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

/** On mount: only digest for home; full prefetch deferred to nav hover. */
const MOUNT_PREFETCH_BY_PAGE: Partial<Record<Page, PrefetchRequest[]>> = {
  home: [{ type: MessageType.GET_WEEKLY_DIGEST }],
};

const prefetchedKeys = new Set<string>();

function requestKey(req: PrefetchRequest): string {
  return `${req.type}:${JSON.stringify(req.payload ?? {})}`;
}

function prefetchRequests(requests: PrefetchRequest[] | undefined): void {
  if (!requests) return;
  for (const req of requests) {
    const key = requestKey(req);
    if (prefetchedKeys.has(key)) continue;
    prefetchedKeys.add(key);
    sendMessage(req.type, req.payload ?? {}).catch(() => {});
  }
}

export function prefetchPage(page: Page): void {
  prefetchRequests(PREFETCH_BY_PAGE[page]);
}

export function prefetchPageOnMount(page: Page): void {
  const mountRequests = MOUNT_PREFETCH_BY_PAGE[page];
  prefetchRequests(mountRequests ?? PREFETCH_BY_PAGE[page]);
}

export function prefetchProps(page: Page): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  return {
    onMouseEnter: () => prefetchPage(page),
    onFocus: () => prefetchPage(page),
  };
}

export function usePrefetch() {
  return { prefetchPage, prefetchPageOnMount, prefetchProps };
}