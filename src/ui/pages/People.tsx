import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, PersonItem, CrewRole } from '@/shared/types';
import { FilmographyView } from '../components/FilmographyView';
import '../styles/people.css';

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
      <header className="page-header people-header">
        <h2 className="page-title">Filmmakers</h2>
        <p className="page-subtitle">Follow directors, actors, and writers to track their entire body of work.</p>
      </header>

      {/* Tabs */}
      <div className="people-tabs">
        <button
          onClick={() => setActiveView('following')}
          className={`people-tab ${activeView === 'following' ? 'active' : ''}`}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={`people-tab ${activeView === 'search' ? 'active' : ''}`}
        >
          Search Filmmakers
        </button>
      </div>

      <div className="people-content">
        {activeView === 'following' ? (
          <div>
            {loadingFollowing && following.length === 0 ? (
              <div className="people-loading">Loading...</div>
            ) : following.length === 0 ? (
              <div className="people-empty-state-text">
                <p className="empty-title">No filmmakers followed yet.</p>
                <p className="empty-subtitle">Search for a director, actor, or cinematographer to begin.</p>
              </div>
            ) : (
              <div className="people-grid">
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
                      className="person-card"
                    >
                      {/* Unfollow button */}
                      <button
                        onClick={(e) => handleUnfollow(person.id, e)}
                        className="person-card-unfollow"
                      >
                        ×
                      </button>

                      {/* Photo */}
                      {person.profileImageUrl ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
                          alt={person.name}
                          className="person-card-photo"
                        />
                      ) : (
                        <div className="person-card-photo-placeholder">
                          {initials}
                        </div>
                      )}

                      {/* Info */}
                      <h3 className="person-card-name">
                        {person.name}
                      </h3>

                      <span className="person-card-role">
                        {person.role}
                      </span>

                      <span className="person-card-stats">
                        {person.filmographyIds.length} titles
                      </span>

                      {person.lastSyncedAt === 0 && (
                        <span className="person-card-sync">
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
              <div className="api-key-warning">
                Add your TMDb API key in Settings to search filmmakers.
              </div>
            )}

            <input
              type="text"
              placeholder="Search for director, actor, writer, producer..."
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              disabled={!hasApiKey}
              className="people-search-input"
            />

            {searchLoading ? (
              <div style={{ color: 'var(--color-text-secondary)' }}>Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="search-results-list">
                {searchResults.map((person) => {
                  const defaultRole = getRoleFromDepartment(person.knownForDepartment);
                  const selectedRole = selectedRoles[person.id] || defaultRole;
                  const isFollowed = followingMap[person.id];

                  return (
                    <div
                      key={person.id}
                      className="search-result-item"
                    >
                      <div className="search-result-info-wrapper">
                        {person.profilePath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                            alt={person.name}
                            className="search-result-photo"
                          />
                        ) : (
                          <div className="search-result-placeholder">
                            {person.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="search-result-name">
                            {person.name}
                          </h4>
                          <div className="search-result-meta">
                            <span className="search-result-dept">
                              {person.knownForDepartment}
                            </span>
                            {person.knownFor.length > 0 && (
                              <span className="search-result-known-for">
                                Known for: {person.knownFor.map((k: any) => k.title).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="search-result-actions">
                        {/* Role select */}
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [person.id]: (e.target as HTMLSelectElement).value as CrewRole }))}
                          disabled={isFollowed}
                          className="role-select"
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
              <div className="search-empty-state">No filmmakers found matching that search query.</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
