import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, PersonItem, CrewRole, UserPreferences } from '@/shared/types';
import { FilmographyView } from '../components/FilmographyView';
import '../styles/people.css';

interface PersonSearchItem {
  id: string;
  name: string;
  knownForDepartment: string;
  profilePath?: string | null;
  knownFor?: Array<{ title?: string; name?: string; mediaType?: string }>;
}

const ROLE_OPTIONS: { value: CrewRole; label: string }[] = [
  { value: 'director', label: 'Director' },
  { value: 'writer', label: 'Writer' },
  { value: 'cinematographer', label: 'Cinematographer' },
  { value: 'actor', label: 'Actor' },
  { value: 'composer', label: 'Composer' },
  { value: 'producer', label: 'Producer' },
  { value: 'editor', label: 'Editor' },
];

function isAuthorPerson(person: { id: string; knownForDepartment?: string; role?: string }): boolean {
  return (
    person.id.startsWith('openlibrary_author_') ||
    person.knownForDepartment === 'Author' ||
    person.role === 'writer' && person.id.startsWith('openlibrary_author_')
  );
}

function displayRoleLabel(person: { id: string; role?: string; knownForDepartment?: string }): string {
  if (isAuthorPerson(person) || person.knownForDepartment === 'Author') return 'Author';
  return person.role || person.knownForDepartment || 'Creator';
}

function profileImageSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

function getRoleFromDepartment(dept: string): CrewRole {
  if (dept === 'Author') return 'writer';
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
  const [unfollowConfirmId, setUnfollowConfirmId] = useState<string | null>(null);

  // Search view states
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PersonSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [openLibraryEnabled, setOpenLibraryEnabled] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, CrewRole>>({});

  const canSearch = hasApiKey || openLibraryEnabled;

  const loadFollowing = useCallback(async () => {
    setLoadingFollowing(true);
    try {
      const res = await sendMessage<Record<string, unknown>, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {});
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
    sendMessage<Record<string, unknown>, UserPreferences>(MessageType.GET_PREFERENCES, {}).then((res) => {
      if (res.success && res.data) {
        setHasApiKey(!!res.data.tmdbApiKey);
        setOpenLibraryEnabled(res.data.openLibraryEnabled !== false);
      }
    }).catch(() => {});
    loadFollowing();
  }, [loadFollowing]);

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message && (message as Record<string, unknown>).type === 'FILMMAKERS_UPDATED') {
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
        const res = await sendMessage<{ query: string }, { results: PersonSearchItem[] }>(MessageType.SEARCH_PERSON, {
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

  const handleFollow = async (person: PersonSearchItem) => {
    const role = selectedRoles[person.id] || getRoleFromDepartment(person.knownForDepartment);
    try {
      const res = await sendMessage<Record<string, unknown>, { success: boolean; alreadyFollowing?: boolean }>(
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

  const handleUnfollow = async (id: string) => {
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
        setUnfollowConfirmId(null);
        if (selectedPerson && selectedPerson.id === id) {
          setSelectedPerson(null);
        }
      }
    } catch (err) {
      console.error('[Subsume] Unfollow failed:', err);
    }
  };

  if (selectedPerson) {
    return (
      <FilmographyView
        person={selectedPerson}
        onBack={() => {
          setSelectedPerson(null);
          setUnfollowConfirmId(null);
          loadFollowing();
        }}
        onUnfollow={() => handleUnfollow(selectedPerson.id)}
      />
    );
  }

  return (
    <div className="page-container sanctuary-page-shell">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Filmmakers</span>
        </div>
        <h2 className="sanctuary-title">Creators</h2>
        <p className="sanctuary-description">
          Follow filmmakers and authors you care about and keep their repertoire in your private archive.
        </p>
      </header>

      <div className="people-sanctuary-tabs">
        <button
          type="button"
          onClick={() => setActiveView('following')}
          className={`people-sanctuary-tab${activeView === 'following' ? ' active' : ''}`}
        >
          Following ({following.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveView('search')}
          className={`people-sanctuary-tab${activeView === 'search' ? ' active' : ''}`}
        >
          Search catalogue
        </button>
      </div>

      <div>
        {activeView === 'following' ? (
          <div>
            {loadingFollowing && following.length === 0 ? (
              <div className="sanctuary-loading-text">
                Loading filmmakers…
              </div>
            ) : following.length === 0 ? (
              <div className="sanctuary-empty-plaque">
                <span className="sanctuary-plaque-index">Registry Index 00</span>
                <h3 className="sanctuary-plaque-title">No filmmakers followed yet</h3>
                <p className="sanctuary-plaque-text">
                  Search the catalogue to follow directors, cinematographers, actors, and other luminaries in your archive.
                </p>
              </div>
            ) : (
              <div className="people-sanctuary-grid">
                {following.map((person) => {
                  const initials = person.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const confirmId = `unfollow-confirm-${person.id}`;
                  const isConfirming = unfollowConfirmId === person.id;

                  return (
                    <article key={person.id} className="people-sanctuary-card">
                      {isConfirming ? (
                        <div
                          className="people-unfollow-confirm"
                          role="group"
                          aria-labelledby={confirmId}
                          aria-describedby={`${confirmId}-desc`}
                        >
                          <span id={confirmId} className="people-unfollow-confirm-label">
                            Unfollow?
                          </span>
                          <span id={`${confirmId}-desc`} className="sr-only">
                            Stop following {person.name}
                          </span>
                          <button
                            type="button"
                            className="people-unfollow-confirm-btn"
                            onClick={() => handleUnfollow(person.id)}
                          >
                            Unfollow
                          </button>
                          <button
                            type="button"
                            className="people-unfollow-cancel-btn"
                            onClick={() => setUnfollowConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnfollowConfirmId(person.id);
                          }}
                          className="people-sanctuary-unfollow"
                          title="Unfollow"
                          aria-label={`Unfollow ${person.name}`}
                        >
                          ×
                        </button>
                      )}

                      <button
                        type="button"
                        className="people-sanctuary-card-open"
                        aria-label={`Open filmography for ${person.name}`}
                        onClick={() => {
                          setUnfollowConfirmId(null);
                          setSelectedPerson(person);
                        }}
                      >
                        {profileImageSrc(person.profileImageUrl) ? (
                          <img
                            src={profileImageSrc(person.profileImageUrl)!}
                            alt=""
                            className="people-sanctuary-avatar"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="people-sanctuary-avatar-fallback" aria-hidden="true">
                            {initials}
                          </span>
                        )}

                        <span className="people-sanctuary-name">
                          {person.name}
                        </span>

                        <span className="people-sanctuary-role">
                          {displayRoleLabel(person)}
                        </span>

                        <span className="people-sanctuary-count">
                          {person.filmographyIds.length}{' '}
                          {person.filmographyIds.length === 1
                            ? isAuthorPerson(person)
                              ? 'work'
                              : 'archive record'
                            : isAuthorPerson(person)
                              ? 'works'
                              : 'archive records'}
                        </span>

                        {person.lastSyncedAt === 0 && (
                          <span className="people-sanctuary-sync">
                            Syncing filmography…
                          </span>
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="people-search-stack">
            {!canSearch && (
              <div className="people-api-notice">
                Add your TMDb API key in Settings to search filmmakers, or enable Open Library for authors.
              </div>
            )}
            {!hasApiKey && openLibraryEnabled && (
              <div className="people-api-notice">
                Searching authors via Open Library. Add a TMDb key to also search filmmakers.
              </div>
            )}

            <input
              type="text"
              placeholder="Search director, actor, author, cinematographer…"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              disabled={!canSearch}
              className="people-sanctuary-search"
            />

            {searchLoading ? (
              <div className="sanctuary-loading-text sm">Searching catalogue…</div>
            ) : searchResults.length > 0 ? (
              <div className="people-search-results">
                {searchResults.map((person) => {
                  const isAuthor = isAuthorPerson(person);
                  const defaultRole = getRoleFromDepartment(person.knownForDepartment);
                  const selectedRole = selectedRoles[person.id] || defaultRole;
                  const isFollowed = followingMap[person.id];
                  const imgSrc = profileImageSrc(person.profilePath);

                  return (
                    <div key={person.id} className="people-search-result">
                      <div className="people-search-result-info">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={person.name}
                            className="people-search-avatar"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="people-search-avatar-fallback">
                            {person.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="people-search-name">
                            {person.name}
                          </h4>
                          <div className="people-search-meta">
                            <span className="people-search-dept">
                              {isAuthor ? 'Author' : person.knownForDepartment}
                            </span>
                            {person.knownFor && person.knownFor.length > 0 && (
                              <span className="people-search-known">
                                Known for: {person.knownFor.map((k: { title?: string; name?: string }) => k.title || k.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="people-search-actions">
                        {isAuthor ? (
                          <span className="people-search-dept" style={{ alignSelf: 'center' }}>
                            Author
                          </span>
                        ) : (
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [person.id]: (e.target as HTMLSelectElement).value as CrewRole }))}
                            disabled={isFollowed}
                            className="people-role-select"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option value={opt.value} key={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={() => handleFollow(person)}
                          disabled={isFollowed}
                          className={`people-enroll-btn${isFollowed ? ' enrolled' : ' active'}`}
                        >
                          {isFollowed ? 'Following ✓' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div className="sanctuary-empty-plaque">No creators matched your search.</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
