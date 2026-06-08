import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, PersonItem, CrewRole, MediaItem, LibraryItem, LibraryStatus } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';

const ROLE_OPTIONS: { value: CrewRole; label: string }[] = [
  { value: 'director', label: 'Director' },
  { value: 'writer', label: 'Writer' },
  { value: 'cinematographer', label: 'Cinematographer' },
  { value: 'actor', label: 'Actor' },
  { value: 'composer', label: 'Composer' },
  { value: 'producer', label: 'Producer' },
  { value: 'editor', label: 'Editor' },
];

function getRoleFromDepartment(dept: string): CrewRole {
  if (dept === 'Acting') return 'actor';
  if (dept === 'Directing') return 'director';
  if (dept === 'Writing') return 'writer';
  if (dept === 'Camera') return 'cinematographer';
  if (dept === 'Sound') return 'composer';
  if (dept === 'Editing') return 'editor';
  if (dept === 'Production') return 'producer';
  return 'director';
}

export function People() {
  const [activeView, setActiveView] = useState<'following' | 'search'>('following');
  const [following, setFollowing] = useState<PersonItem[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonItem | null>(null);

  // Search view states
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, CrewRole>>({});

  const loadFollowing = useCallback(async () => {
    setLoadingFollowing(true);
    try {
      const res = await sendMessage<any, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {});
      if (res.success && res.data?.people) {
        setFollowing(res.data.people);
        const map: Record<string, boolean> = {};
        res.data.people.forEach((p) => {
          map[p.id] = true;
        });
        setFollowingMap(map);
      }
    } catch (err) {
      console.error('[Subsume] Failed to load followed people:', err);
    } finally {
      setLoadingFollowing(false);
    }
  }, []);

  useEffect(() => {
    sendMessage<any, any>(MessageType.GET_PREFERENCES, {}).then((res) => {
      if (res.success && res.data) {
        setHasApiKey(!!res.data.tmdbApiKey);
      }
    });
    loadFollowing();
  }, [loadFollowing]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message && message.type === 'FILMMAKERS_UPDATED') {
        loadFollowing();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [loadFollowing]);

  useEffect(() => {
    if (activeView === 'following') {
      loadFollowing();
    }
  }, [activeView, loadFollowing]);

  // Debounced search for filmmakers
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await sendMessage<{ query: string }, { results: any[] }>(MessageType.SEARCH_PERSON, {
          query: query.trim(),
        });
        if (res.success && res.data?.results) {
          setSearchResults(res.data.results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('[Subsume] Person search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleFollow = async (person: any) => {
    const role = selectedRoles[person.id] || getRoleFromDepartment(person.knownForDepartment);
    try {
      const res = await sendMessage<any, { success: boolean; alreadyFollowing?: boolean }>(
        MessageType.FOLLOW_PERSON,
        {
          personId: person.id,
          name: person.name,
          knownForDepartment: person.knownForDepartment,
          profilePath: person.profilePath || null,
          knownFor: person.knownFor, // Search returns p.knownFor as array of { title, mediaType } objects
          role,
        }
      );
      if (res.success || res.data?.alreadyFollowing) {
        setFollowingMap((prev) => ({ ...prev, [person.id]: true }));
        loadFollowing();
      }
    } catch (err) {
      console.error('[Subsume] Follow failed:', err);
    }
  };

  const handleUnfollow = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await sendMessage<{ personId: string }, { success: boolean }>(
        MessageType.UNFOLLOW_PERSON,
        { personId: id }
      );
      if (res.success) {
        setFollowing((prev) => prev.filter((p) => p.id !== id));
        setFollowingMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (selectedPerson && selectedPerson.id === id) {
          setSelectedPerson(null);
        }
      }
    } catch (err) {
      console.error('[Subsume] Unfollow failed:', err);
    }
  };

  if (selectedPerson) {
    return <FilmographyView person={selectedPerson} onBack={() => { setSelectedPerson(null); loadFollowing(); }} onUnfollow={(e) => handleUnfollow(selectedPerson.id, e)} />;
  }

  return (
    <div className="page-container">
      <header className="page-header" style={{ marginBottom: 24 }}>
        <h2 className="page-title">Filmmakers</h2>
        <p className="page-subtitle">Follow directors, actors, and writers to track their entire body of work.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--color-border)', padding: '0 32px', marginBottom: 24 }}>
        <button
          onClick={() => setActiveView('following')}
          style={{
            background: 'none',
            border: 'none',
            color: activeView === 'following' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            padding: '12px 4px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeView === 'following' ? '2px solid var(--gold)' : '2px solid transparent',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setActiveView('search')}
          style={{
            background: 'none',
            border: 'none',
            color: activeView === 'search' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            padding: '12px 4px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeView === 'search' ? '2px solid var(--gold)' : '2px solid transparent',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Search Filmmakers
        </button>
      </div>

      <div style={{ padding: '0 32px' }}>
        {activeView === 'following' ? (
          <div>
            {loadingFollowing && following.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>Loading...</div>
            ) : following.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 32px', color: 'var(--color-text-secondary)' }}>
                <p style={{ fontSize: 16, fontStyle: 'italic', marginBottom: 8 }}>No filmmakers followed yet.</p>
                <p style={{ fontSize: 14 }}>Search for a director, actor, or cinematographer to begin.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 20,
              }}>
                {following.map((person) => {
                  const initials = person.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      style={{
                        position: 'relative',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 10,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'none';
                      }}
                    >
                      {/* Unfollow button */}
                      <button
                        onClick={(e) => handleUnfollow(person.id, e)}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          fontSize: 16,
                          cursor: 'pointer',
                          padding: 4,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>

                      {/* Photo */}
                      {person.profileImageUrl ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
                          alt={person.name}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            marginBottom: 12,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: 'var(--color-surface-hover)',
                            color: 'var(--gold)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: 14,
                            marginBottom: 12,
                          }}
                        >
                          {initials}
                        </div>
                      )}

                      {/* Info */}
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                        {person.name}
                      </h3>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background: 'var(--color-surface-hover)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 20,
                          padding: '2px 10px',
                          color: 'var(--color-text-secondary)',
                          marginBottom: 8,
                        }}
                      >
                        {person.role}
                      </span>

                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {person.filmographyIds.length} titles
                      </span>

                      {person.lastSyncedAt === 0 && (
                        <span style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          Syncing...
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {!hasApiKey && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: 12, color: '#f87171', fontSize: 14, marginBottom: 16 }}>
                Add your TMDb API key in Settings to search filmmakers.
              </div>
            )}

            <input
              type="text"
              placeholder="Search for director, actor, writer, producer..."
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              disabled={!hasApiKey}
              style={{
                width: '100%',
                maxWidth: 480,
                padding: '10px 14px',
                background: 'var(--color-surface-hover)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: 8,
                fontSize: 15,
                marginBottom: 24,
              }}
            />

            {searchLoading ? (
              <div style={{ color: 'var(--color-text-secondary)' }}>Searching...</div>
            ) : searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {searchResults.map((person) => {
                  const defaultRole = getRoleFromDepartment(person.knownForDepartment);
                  const selectedRole = selectedRoles[person.id] || defaultRole;
                  const isFollowed = followingMap[person.id];

                  return (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 10,
                        padding: 16,
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {person.profilePath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                            alt={person.name}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: 'var(--color-surface-hover)',
                              color: 'var(--gold)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: 13,
                            }}
                          >
                            {person.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px 0' }}>
                            {person.name}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'var(--color-text-secondary)' }}>
                              {person.knownForDepartment}
                            </span>
                            {person.knownFor.length > 0 && (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--color-text-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: 240,
                                }}
                              >
                                Known for: {person.knownFor.map((k: any) => k.title).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Role select */}
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [person.id]: (e.target as HTMLSelectElement).value as CrewRole }))}
                          disabled={isFollowed}
                          style={{
                            background: 'var(--color-surface-hover)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option value={opt.value} key={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {/* Follow btn */}
                        <button
                          className={`btn ${isFollowed ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleFollow(person)}
                          disabled={isFollowed}
                          style={{ padding: '8px 16px', fontSize: 13, minWidth: 100 }}
                        >
                          {isFollowed ? 'Following ✓' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>No filmmakers found matching that search query.</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilmographyProps {
  person: PersonItem;
  onBack: () => void;
  onUnfollow: (e: MouseEvent) => void;
}

function FilmographyView({ person: initialPerson, onBack, onUnfollow }: FilmographyProps) {
  const [filmography, setFilmography] = useState<MediaItem[]>([]);
  const [person, setPerson] = useState<PersonItem>(initialPerson);
  const [loading, setLoading] = useState(false);
  const [libraryMap, setLibraryMap] = useState<Record<string, LibraryItem>>({});
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Modal selected item
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Add all watchlist states
  const [addingAll, setAddingAll] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  // Filters and sorts
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv' | 'library' | 'unwatched'>('all');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'rating' | 'title'>('year-desc');

  const loadFilmography = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage<{ personId: string }, { items: MediaItem[]; person: PersonItem }>(
        MessageType.GET_FILMOGRAPHY,
        { personId: initialPerson.id }
      );
      const libRes = await sendMessage<any, { library: LibraryItem; media: MediaItem }[]>(
        MessageType.GET_LIBRARY,
        {}
      );

      if (res.success && res.data) {
        setFilmography(res.data.items);
        setPerson(res.data.person || initialPerson);
      }
      if (libRes.success && libRes.data) {
        const map: Record<string, LibraryItem> = {};
        for (const item of libRes.data) {
          map[item.library.mediaId] = item.library;
        }
        setLibraryMap(map);
      }
    } catch (err) {
      console.error('[Subsume] Failed to load filmography details:', err);
    } finally {
      setLoading(false);
    }
  }, [initialPerson]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message && message.type === 'FILMMAKERS_UPDATED' && message.personId === person.id) {
        loadFilmography();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [person.id, loadFilmography]);

  useEffect(() => {
    loadFilmography();

    // Silently sync if lastSyncedAt is 0 or older than 7 days
    const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;
    if (initialPerson.lastSyncedAt === 0 || Date.now() - initialPerson.lastSyncedAt > sevenDaysMs) {
      sendMessage<{ personId: string }, { synced: number }>(MessageType.SYNC_FILMOGRAPHY, {
        personId: initialPerson.id,
      }).then((res) => {
        if (res.success) {
          loadFilmography();
        }
      });
    }
  }, [initialPerson, loadFilmography]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const syncRes = await sendMessage<{ personId: string }, { synced: number }>(
        MessageType.SYNC_FILMOGRAPHY,
        { personId: person.id }
      );
      if (syncRes.success) {
        await loadFilmography();
      }
    } catch (err) {
      console.error('[Subsume] Sync failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const notInLibraryCount = useMemo(() => {
    return filmography.filter((item) => !libraryMap[item.id]).length;
  }, [filmography, libraryMap]);

  const handleAddAll = async () => {
    const unadded = filmography.filter((item) => !libraryMap[item.id]);
    if (unadded.length === 0) return;
    setAddingAll(true);
    try {
      // Process sequentially to protect IndexedDB and Chrome message ports from flooding
      for (const item of unadded) {
        await sendMessage(MessageType.ADD_TO_LIST, {
          mediaItem: item,
          type: item.type,
        });
      }
      setAddedAll(true);
      await loadFilmography();
    } catch (err) {
      console.error('[Subsume] Failed to add all to watchlist:', err);
    } finally {
      setAddingAll(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return filmography.filter((item) => {
      const inLibrary = !!libraryMap[item.id];
      if (filter === 'movie') return item.type === 'movie';
      if (filter === 'tv') return item.type === 'tv';
      if (filter === 'library') return inLibrary;
      if (filter === 'unwatched') {
        const isWatched = libraryMap[item.id]?.status === 'watched';
        return !isWatched;
      }
      return true;
    });
  }, [filmography, filter, libraryMap]);

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      if (sortBy === 'year-desc') {
        return b.year - a.year;
      }
      if (sortBy === 'year-asc') {
        return a.year - b.year;
      }
      if (sortBy === 'rating') {
        const aScore = a.ratings.find((r) => r.provider === 'tmdb')?.score || 0;
        const bScore = b.ratings.find((r) => r.provider === 'tmdb')?.score || 0;
        return bScore - aScore;
      }
      if (sortBy === 'title') {
        return a.canonicalTitle.localeCompare(b.canonicalTitle, undefined, { sensitivity: 'base' });
      }
      return 0;
    });
    return items;
  }, [filteredItems, sortBy]);

  // Formatted last synced time string
  const syncString = useMemo(() => {
    if (person.lastSyncedAt === 0) return 'Syncing...';
    const deltaMs = Date.now() - person.lastSyncedAt;
    const deltaDays = Math.floor(deltaMs / (1000 * 60 * 60 * 24));
    if (deltaDays === 0) return 'Synced today';
    if (deltaDays === 1) return 'Synced 1 day ago';
    return `Synced ${deltaDays} days ago`;
  }, [person.lastSyncedAt]);

  // DetailModal status/rating helpers
  const handleUpdateStatus = async (mediaId: string, status: LibraryStatus) => {
    const res = await sendMessage(MessageType.UPDATE_STATUS, { mediaId, status });
    if (res.success) {
      setLibraryMap((prev) => ({
        ...prev,
        [mediaId]: { ...prev[mediaId], mediaId, status, updatedAt: Date.now(), addedAt: prev[mediaId]?.addedAt || Date.now() },
      }));
    }
  };

  const handleUpdateRating = async (mediaId: string, rating: number) => {
    const res = await sendMessage(MessageType.SET_USER_RATING, { mediaId, rating });
    if (res.success) {
      setLibraryMap((prev) => ({
        ...prev,
        [mediaId]: { ...prev[mediaId], userRating: rating },
      }));
    }
  };

  const handleUpdateTags = async (mediaId: string, tags: string[]) => {
    const res = await sendMessage(MessageType.SET_USER_TAGS, { mediaId, tags });
    if (res.success) {
      setLibraryMap((prev) => ({
        ...prev,
        [mediaId]: { ...prev[mediaId], userTags: tags },
      }));
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 32px', marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            padding: '6px 0',
          }}
        >
          ← Back
        </button>

        <button
          onClick={(e) => { onUnfollow(e); onBack(); }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 6,
            color: '#f87171',
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Unfollow
        </button>
      </div>

      {/* Person Bio Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 24,
          margin: '0 32px 24px 32px',
          display: 'flex',
          gap: 20,
        }}
      >
        {person.profileImageUrl ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
            alt={person.name}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              alignSelf: 'flex-start',
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--color-surface-hover)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 18,
              alignSelf: 'flex-start',
            }}
          >
            {person.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{person.name}</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'capitalize',
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 20,
                padding: '2px 10px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {person.role}
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', gap: 8 }}>
            <span>{syncString}</span>
            <span>·</span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Refresh
            </button>
          </div>

          {person.biography ? (
            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: bioExpanded ? 'unset' : 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.5',
                  color: 'var(--color-text-secondary)',
                  fontSize: 14,
                  margin: 0,
                }}
              >
                {person.biography}
              </p>
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 6,
                  padding: 0,
                }}
              >
                {bioExpanded ? 'Read less' : 'Read more'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 12, margin: 0 }}>
              No biography available.
            </p>
          )}

          {/* Add all watchlist button */}
          {notInLibraryCount > 0 && (
            <button
              onClick={handleAddAll}
              disabled={addingAll || addedAll}
              className="btn btn-primary"
              style={{
                marginTop: 16,
                padding: '8px 16px',
                fontSize: 13,
              }}
            >
              {addingAll ? 'Adding...' : addedAll ? 'Added!' : `Add all ${notInLibraryCount} titles to watchlist`}
            </button>
          )}
        </div>
      </div>

      {/* Filters and sorting Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          margin: '24px 32px',
        }}
      >
        {/* Filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['all', 'movie', 'tv', 'library', 'unwatched'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              style={{
                background: filter === opt ? 'rgba(201, 168, 76, 0.15)' : 'var(--color-surface)',
                color: filter === opt ? 'var(--gold)' : 'var(--color-text-secondary)',
                border: filter === opt ? '1px solid var(--gold)' : '1px solid var(--color-border)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {opt === 'all' ? 'All' : opt === 'movie' ? 'Movies' : opt === 'tv' ? 'TV' : opt === 'library' ? 'In Library' : 'Unwatched'}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <option value="year-desc">Year (desc)</option>
            <option value="year-asc">Year (asc)</option>
            <option value="rating">Rating</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {/* Poster Grid */}
      {loading && sortedItems.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>Loading filmography...</div>
      ) : sortedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          No titles found matching current filters.
        </div>
      ) : (
        <div className="card-grid" style={{ padding: '0 32px' }}>
          {sortedItems.map((item) => {
            const libItem = libraryMap[item.id];
            const tmdbRating = item.ratings.find((r) => r.provider === 'tmdb');
            const imdbRating = item.ratings.find((r) => r.provider === 'imdb');

            return (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '2/3',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#18181b',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {/* Top Left Badge: IMDb score */}
                  {imdbRating && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'var(--gold)',
                        color: '#121212',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 6px',
                        borderRadius: 4,
                        zIndex: 2,
                      }}
                    >
                      IMDb {imdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {/* Top Right Badge: TMDb score */}
                  {tmdbRating && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '3px 6px',
                        borderRadius: 4,
                        zIndex: 2,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      ★ {tmdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {/* Poster Image */}
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.canonicalTitle}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 12,
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {item.canonicalTitle}
                    </div>
                  )}

                  {/* Bottom Overlay Dot Indicator */}
                  {libItem && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background:
                          libItem.status === 'to-watch'
                            ? 'var(--gold)'
                            : libItem.status === 'watching'
                            ? '#60a5fa'
                            : libItem.status === 'watched'
                            ? '#4ade80'
                            : libItem.status === 'abandoned'
                            ? '#f87171'
                            : 'transparent',
                        zIndex: 2,
                        boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                      }}
                    />
                  )}
                </div>

                {/* Poster Footer: Title & meta */}
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: '4px 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.canonicalTitle}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.year || '—'}</span>
                  {libItem && libItem.status === 'watched' && libItem.userRating && (
                    <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
                      ★ {libItem.userRating}/10
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          libraryItem={libraryMap[selectedMedia.id]}
          onClose={() => setSelectedMedia(null)}
          onUpdateStatus={(status) => handleUpdateStatus(selectedMedia.id, status)}
          onUpdateRating={(rating) => handleUpdateRating(selectedMedia.id, rating)}
          onUpdateTags={(tags) => handleUpdateTags(selectedMedia.id, tags)}
          onAddToLibrary={async () => {
            await sendMessage(MessageType.ADD_TO_LIST, {
              mediaItem: selectedMedia,
              type: selectedMedia.type,
            });
            await loadFilmography();
          }}
        />
      )}
    </div>
  );
}
