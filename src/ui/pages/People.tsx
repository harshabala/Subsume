import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
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
  const [searchResults, setSearchResults] = useState<PersonSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, CrewRole>>({});

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
    <div className="page-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-artwork)', paddingBottom: 64 }}>
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Auteur Archive</span>
        </div>
        <h2 className="sanctuary-title">Filmmakers</h2>
        <p className="sanctuary-description">Follow directors, actors, and writers to track their entire body of work across cinematic history.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-restraint)', paddingBottom: 1, marginBottom: 36 }}>
        <button
          onClick={() => setActiveView('following')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeView === 'following' ? '2px solid var(--border-hero)' : '2px solid transparent',
            color: activeView === 'following' ? 'var(--border-hero)' : 'var(--text-meta)',
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            padding: '12px 4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Enrolled Auteurs ({following.length})
        </button>
        <button
          onClick={() => setActiveView('search')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeView === 'search' ? '2px solid var(--border-hero)' : '2px solid transparent',
            color: activeView === 'search' ? 'var(--border-hero)' : 'var(--text-meta)',
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            padding: '12px 4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Catalogue Enquiry
        </button>
      </div>

      <div>
        {activeView === 'following' ? (
          <div>
            {loadingFollowing && following.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-meta)' }}>
                Consulting auteur registry...
              </div>
            ) : following.length === 0 ? (
              <div className="sanctuary-empty-plaque">
                <span className="sanctuary-plaque-index">Registry Index 00</span>
                <h3 className="sanctuary-plaque-title">No auteurs enrolled</h3>
                <p className="sanctuary-plaque-text">
                  Enquire the global catalogue to enroll directors, cinematographers, or actors into your private sanctuary.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
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
                        background: 'var(--bg-plaque)',
                        border: '1px solid var(--border-restraint)',
                        borderRadius: 4,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        backdropFilter: 'var(--blur-hero)',
                        transition: 'border-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hero)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-restraint)'}
                    >
                      {/* Unfollow button */}
                      <button
                        onClick={(e) => handleUnfollow(person.id, e)}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-meta)',
                          fontSize: 16,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          lineHeight: 1
                        }}
                        title="Rescind enrollment"
                      >
                        ×
                      </button>

                      {/* Photo */}
                      {person.profileImageUrl ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
                          alt={person.name}
                          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-restraint)', marginBottom: 16 }}
                        />
                      ) : (
                        <div style={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'hsla(0, 0%, 100%, 0.03)',
                          border: '1px solid var(--border-restraint)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-editorial)',
                          fontStyle: 'italic',
                          fontSize: 24,
                          color: 'var(--border-hero)',
                          marginBottom: 16
                        }}>
                          {initials}
                        </div>
                      )}

                      {/* Info */}
                      <h3 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: 'var(--text-reflection)', margin: '0 0 6px 0' }}>
                        {person.name}
                      </h3>

                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)', marginBottom: 12 }}>
                        {person.role}
                      </span>

                      <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--border-hero)' }}>
                        {person.filmographyIds.length} {person.filmographyIds.length === 1 ? 'archive record' : 'archive records'}
                      </span>

                      {person.lastSyncedAt === 0 && (
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-meta)', marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Synchronizing...
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {!hasApiKey && (
              <div style={{ background: 'hsla(43, 74%, 49%, 0.1)', border: '1px solid var(--border-hero)', padding: 16, borderRadius: 2, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--border-hero)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Provide TMDb archival credential in Settings to conduct global auteur enquiries.
              </div>
            )}

            <input
              type="text"
              placeholder="Enquire director, actor, cinematographer, composer..."
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              disabled={!hasApiKey}
              style={{
                background: 'var(--bg-plaque)',
                border: '1px solid var(--border-restraint)',
                borderRadius: 2,
                padding: '14px 18px',
                fontFamily: 'var(--font-editorial)',
                fontStyle: 'italic',
                fontSize: 16,
                color: 'var(--text-reflection)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />

            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: 32, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 16, color: 'var(--text-meta)' }}>Enquiring archives...</div>
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
                        background: 'var(--bg-plaque)',
                        border: '1px solid var(--border-restraint)',
                        borderRadius: 4,
                        padding: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                        backdropFilter: 'var(--blur-hero)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {person.profilePath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                            alt={person.name}
                            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-restraint)' }}
                          />
                        ) : (
                          <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: 'hsla(0, 0%, 100%, 0.03)',
                            border: '1px solid var(--border-restraint)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-editorial)',
                            fontStyle: 'italic',
                            fontSize: 18,
                            color: 'var(--border-hero)'
                          }}>
                            {person.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: 'var(--text-reflection)', margin: '0 0 4px 0' }}>
                            {person.name}
                          </h4>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 12 }}>
                              {person.knownForDepartment}
                            </span>
                            {person.knownFor && person.knownFor.length > 0 && (
                              <span style={{ color: 'var(--text-artwork)', fontStyle: 'italic', fontFamily: 'var(--font-editorial)' }}>
                                Known for: {person.knownFor.map((k: { title?: string; name?: string }) => k.title || k.name).join(', ')}
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
                            background: 'hsla(0, 0%, 100%, 0.03)',
                            border: '1px solid var(--border-restraint)',
                            color: 'var(--text-sanctuary)',
                            borderRadius: 2,
                            padding: '8px 12px',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 12,
                            outline: 'none'
                          }}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option value={opt.value} key={opt.value} style={{ background: 'hsl(240, 18%, 8%)' }}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {/* Follow btn */}
                        <button
                          onClick={() => handleFollow(person)}
                          disabled={isFollowed}
                          style={{
                            background: isFollowed ? 'transparent' : 'var(--border-hero)',
                            border: isFollowed ? '1px solid var(--border-restraint)' : 'none',
                            color: isFollowed ? 'var(--text-meta)' : 'hsl(240, 18%, 5%)',
                            padding: '10px 20px',
                            borderRadius: 2,
                            fontFamily: 'var(--font-ui)',
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            cursor: isFollowed ? 'default' : 'pointer'
                          }}
                        >
                          {isFollowed ? 'Enrolled ✓' : 'Enroll Auteur'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div className="sanctuary-empty-plaque">No auteurs located matching enquiry.</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
