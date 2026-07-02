import { render } from 'preact';
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { sendMessage } from '../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem } from '../shared/types';
import { applyThemePreference } from '../shared/theme';
import '../shared/tokens.css';
import './styles/popup.css';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

function openSanctuary(page?: string) {
  const url = chrome.runtime.getURL(`ui/index.html${page ? `?page=${page}` : ''}`);
  chrome.tabs.create({ url });
}

function Popup() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JoinedItem[]>([]);
  const [stats, setStats] = useState({ total: 0, watched: 0, toWatch: 0 });
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [libRes, prefsRes] = await Promise.all([
          sendMessage(MessageType.GET_LIBRARY, { sortBy: 'addedAt' }),
          sendMessage<{ revealKeys?: boolean }, UserPreferences>(
            MessageType.GET_FULL_PREFERENCES,
            { revealKeys: false }
          ),
        ]);

        const joined = (libRes.data || []) as JoinedItem[];
        setItems(joined.slice(0, 4));
        setStats({
          total: joined.length,
          watched: joined.filter((j) => j.library.status === 'watched').length,
          toWatch: joined.filter((j) => j.library.status === 'to-watch').length,
        });

        const p = prefsRes.data!;
        setPrefs(p);
        applyThemePreference(p.theme ?? 'dark');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        applyThemePreference('dark');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return h('div', { className: 'popup-shell' }, h('div', { className: 'popup-loading' }, 'Opening sanctuary…'));
  }

  if (error) {
    return h('div', { className: 'popup-shell' }, [
      h('div', { className: 'popup-header' }, [
        h('div', { className: 'popup-brand' }, 'Subsume'),
        h('div', { className: 'popup-tagline' }, 'Your cinematic journal'),
      ]),
      h('div', { className: 'popup-empty' }, error),
      h('div', { className: 'popup-actions' }, [
        h('button', { className: 'popup-btn popup-btn-primary', onClick: () => openSanctuary() }, 'Open Sanctuary'),
      ]),
    ]);
  }

  const overlaysOn = prefs?.posterOverlaysEnabled !== false;
  const hoverOn = prefs?.hoverCardsEnabled !== false;
  const hasTmdb = Boolean(prefs?.tmdbApiKey?.trim());
  const hasOmdb = Boolean(prefs?.omdbApiKey?.trim());

  return h('div', { className: 'popup-shell' }, [
    h('div', { className: 'popup-header' }, [
      h('div', { className: 'popup-brand' }, 'Subsume'),
      h('div', { className: 'popup-tagline' }, 'Track films as you browse'),
    ]),

    h('div', { className: 'popup-stats' }, [
      h('div', { className: 'popup-stat' }, [
        h('div', { className: 'popup-stat-value' }, String(stats.total)),
        h('div', { className: 'popup-stat-label' }, 'In Library'),
      ]),
      h('div', { className: 'popup-stat' }, [
        h('div', { className: 'popup-stat-value' }, String(stats.watched)),
        h('div', { className: 'popup-stat-label' }, 'Watched'),
      ]),
      h('div', { className: 'popup-stat' }, [
        h('div', { className: 'popup-stat-value' }, String(stats.toWatch)),
        h('div', { className: 'popup-stat-label' }, 'To Watch'),
      ]),
    ]),

    h('div', { className: 'popup-status' }, [
      h('div', null, [
        'Browsing overlays: ',
        h('strong', { className: overlaysOn && hoverOn ? 'popup-status-ok' : 'popup-status-warn' },
          overlaysOn && hoverOn ? 'Active' : 'Partially off'),
      ]),
      h('div', null, [
        'Ratings API: ',
        hasTmdb || hasOmdb
          ? h('strong', { className: 'popup-status-ok' }, hasTmdb && hasOmdb ? 'TMDb + OMDb' : hasTmdb ? 'TMDb' : 'OMDb')
          : h('strong', { className: 'popup-status-warn' }, 'Free sources (add keys for IMDb)'),
      ]),
    ]),

    h('div', { className: 'popup-section' }, [
      h('div', { className: 'popup-section-title' }, 'Recent in Sanctuary'),
      items.length === 0
        ? h('div', { className: 'popup-empty' }, [
            h('p', null, 'Your archive is empty.'),
            h('button', {
              className: 'popup-btn',
              style: { marginTop: '10px' },
              onClick: async () => {
                try {
                  await sendMessage(MessageType.RESTORE_DEMO_LIBRARY, {});
                  window.location.reload();
                } catch {
                  /* ignore */
                }
              },
            }, 'Load Demo Sanctuary'),
          ])
        : h('div', { className: 'popup-recent' },
            items.map((item) =>
              h('button', {
                key: item.library.mediaId,
                type: 'button',
                className: 'popup-recent-item',
                onClick: () => openSanctuary('library'),
              }, [
                item.media.posterUrl
                  ? h('img', { className: 'popup-recent-poster', src: item.media.posterUrl, alt: '' })
                  : h('div', { className: 'popup-recent-poster' }),
                h('div', { className: 'popup-recent-meta' }, [
                  h('div', { className: 'popup-recent-title' }, item.media.canonicalTitle),
                  h('div', { className: 'popup-recent-sub' },
                    `${item.media.year || '—'} · ${item.library.status.replace('-', ' ')}`),
                ]),
              ])
            )
          ),
    ]),

    h('div', { className: 'popup-actions' }, [
      h('button', { className: 'popup-btn popup-btn-primary', onClick: () => openSanctuary() }, 'Open Sanctuary'),
      h('button', { className: 'popup-btn', onClick: () => openSanctuary('library') }, 'View Library'),
      h('button', { className: 'popup-btn', onClick: () => openSanctuary('settings') }, 'Settings & API Keys'),
    ]),
  ]);
}

const root = document.getElementById('popup-root');
if (root) {
  render(h(Popup), root);
}