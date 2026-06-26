import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import {
  MessageType,
  WatchAlert,
  CreateWatchAlertRequest,
} from '@/shared/types';
import { AVAILABLE_GENRES } from '@/shared/genres';
import { AVAILABLE_PLATFORMS } from '@/shared/platforms';

const EMPTY_FORM: CreateWatchAlertRequest = {
  name: '',
  type: 'both',
  genres: [],
  platforms: [],
  keyword: '',
  enabled: true,
};

function formatAlertCriteria(alert: WatchAlert): string {
  const parts: string[] = [];

  if (alert.type && alert.type !== 'both') {
    parts.push(alert.type === 'movie' ? 'Movies' : 'TV');
  }

  if (alert.genres && alert.genres.length > 0) {
    const names = alert.genres
      .map((id) => AVAILABLE_GENRES.find((genre) => genre.id === id)?.name)
      .filter(Boolean);
    if (names.length > 0) {
      parts.push(names.join(', '));
    }
  }

  if (alert.platforms && alert.platforms.length > 0) {
    const names = alert.platforms
      .map((id) => AVAILABLE_PLATFORMS.find((platform) => platform.id === id)?.name)
      .filter(Boolean);
    if (names.length > 0) {
      parts.push(names.join(', '));
    }
  }

  if (alert.keyword?.trim()) {
    parts.push(`"${alert.keyword.trim()}"`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'All new releases';
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
}

export function Alerts() {
  const [alerts, setAlerts] = useState<WatchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateWatchAlertRequest>(EMPTY_FORM);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await sendMessage<{}, WatchAlert[]>(MessageType.GET_WATCH_ALERTS, {});
      if (res.success && res.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const toggleFormArrayItem = (
    key: 'genres' | 'platforms',
    id: string
  ) => {
    const current = form[key] || [];
    const updated = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    setForm({ ...form, [key]: updated });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('Please enter an alert name.');
      return;
    }

    setSaving(true);
    try {
      const res = await sendMessage<CreateWatchAlertRequest, WatchAlert>(
        MessageType.CREATE_WATCH_ALERT,
        {
          ...form,
          name: form.name.trim(),
          keyword: form.keyword?.trim() || undefined,
        }
      );
      if (res.success && res.data) {
        setAlerts((prev) => [res.data!, ...prev]);
        setForm(EMPTY_FORM);
        setShowForm(false);
      }
    } catch (err) {
      console.error('Failed to create alert', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (alert: WatchAlert) => {
    const updated: WatchAlert = { ...alert, enabled: !alert.enabled };
    const res = await sendMessage(MessageType.UPDATE_WATCH_ALERT, { alert: updated });
    if (res.success) {
      setAlerts((prev) => prev.map((item) => (item.id === alert.id ? updated : item)));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await sendMessage(MessageType.DELETE_WATCH_ALERT, { id });
    if (res.success) {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'hsla(0, 0%, 100%, 0.03)',
    border: '1px solid var(--border-restraint)',
    color: 'var(--text-sanctuary)',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const
  };

  const btnGoldStyle = {
    background: 'var(--border-hero)',
    border: 'none',
    color: 'hsl(240, 18%, 5%)',
    padding: '10px 24px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const btnRestraintStyle = {
    background: 'transparent',
    border: '1px solid var(--border-restraint)',
    color: 'var(--text-reflection)',
    padding: '10px 24px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  return (
    <div className="page-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-artwork)', paddingBottom: 64 }}>
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Archival Dispatch</span>
        </div>
        <h2 className="sanctuary-title">Watch Alerts</h2>
        <p className="sanctuary-description">Configure telegraphic surveillance criteria for forthcoming sanctuary releases.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <button
            onClick={() => setShowForm((value) => !value)}
            style={showForm ? btnRestraintStyle : btnGoldStyle}
          >
            {showForm ? 'Cancel Dispatch' : 'Assemble Surveillance Alert'}
          </button>
        </div>

        {showForm && (
          <div
            style={{
              background: 'var(--bg-plaque)',
              border: '1px solid var(--border-hero)',
              borderRadius: 4,
              padding: 28,
              backdropFilter: 'var(--blur-hero)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 20, color: 'var(--text-reflection)', margin: '0 0 20px 0', borderBottom: '1px solid var(--border-restraint)', paddingBottom: 12 }}>
              Telegraphic Dispatch Specification
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>
                  Surveillance Title / Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. A24 Cinema Releases"
                  value={form.name}
                  onInput={(e) =>
                    setForm({ ...form, name: (e.target as HTMLInputElement).value })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>
                  Format Scope
                </label>
                <select
                  value={form.type || 'both'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: (e.target as HTMLSelectElement).value as 'movie' | 'tv' | 'both',
                    })
                  }
                  style={inputStyle}
                >
                  <option value="both" style={{ background: 'hsl(240, 18%, 8%)' }}>Cinema & Series</option>
                  <option value="movie" style={{ background: 'hsl(240, 18%, 8%)' }}>Cinema Only</option>
                  <option value="tv" style={{ background: 'hsl(240, 18%, 8%)' }}>Series Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>
                  Target Genres
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVAILABLE_GENRES.map((genre) => {
                    const active = (form.genres || []).includes(genre.id);
                    return (
                      <label
                        key={genre.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: active ? 'hsla(43, 74%, 49%, 0.1)' : 'transparent',
                          border: `1px solid ${active ? 'var(--border-hero)' : 'var(--border-restraint)'}`,
                          color: active ? 'var(--border-hero)' : 'var(--text-artwork)',
                          padding: '6px 12px',
                          borderRadius: 2,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          fontSize: 12
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleFormArrayItem('genres', genre.id)}
                          style={{ display: 'none' }}
                        />
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'var(--border-hero)' : 'hsla(0,0%,100%,0.2)' }} />
                        {genre.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>
                  Monitored Platforms
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVAILABLE_PLATFORMS.map((platform) => {
                    const active = (form.platforms || []).includes(platform.id);
                    return (
                      <label
                        key={platform.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: active ? 'hsla(43, 74%, 49%, 0.1)' : 'transparent',
                          border: `1px solid ${active ? 'var(--border-hero)' : 'var(--border-restraint)'}`,
                          color: active ? 'var(--border-hero)' : 'var(--text-artwork)',
                          padding: '6px 12px',
                          borderRadius: 2,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          fontSize: 12
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleFormArrayItem('platforms', platform.id)}
                          style={{ display: 'none' }}
                        />
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'var(--border-hero)' : 'hsla(0,0%,100%,0.2)' }} />
                        {platform.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>
                  Inscription Keyword Filter (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Title inscription must include..."
                  value={form.keyword || ''}
                  onInput={(e) =>
                    setForm({ ...form, keyword: (e.target as HTMLInputElement).value })
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  style={btnGoldStyle}
                >
                  {saving ? 'Engraving...' : 'Enroll Surveillance Alert'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-meta)' }}>
            Inspecting dispatch logs...
          </div>
        ) : alerts.length === 0 ? (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">Dispatch Index 00</span>
            <h3 className="sanctuary-plaque-title">No surveillance configured</h3>
            <p className="sanctuary-plaque-text">
              Assemble a surveillance alert to receive telegraphic dispatches when new releases match your exact specifications.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: 'var(--bg-plaque)',
                  border: '1px solid var(--border-restraint)',
                  borderRadius: 4,
                  padding: 24,
                  opacity: alert.enabled ? 1 : 0.5,
                  backdropFilter: 'var(--blur-hero)',
                  transition: 'opacity 0.2s ease'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 20, fontWeight: 400, color: 'var(--text-reflection)', margin: '0 0 8px 0' }}>{alert.name}</h3>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--border-hero)', margin: '0 0 12px 0', letterSpacing: '0.02em' }}>
                      {formatAlertCriteria(alert)}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-ui)',
                        color: 'var(--text-meta)',
                        fontSize: 11,
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}
                    >
                      Last Enquiry: {formatTimestamp(alert.lastCheckedAt)}
                      {alert.lastMatchAt
                        ? ` · Last Resonance: ${formatTimestamp(alert.lastMatchAt)}`
                        : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-ui)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        color: alert.enabled ? 'var(--text-artwork)' : 'var(--text-meta)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={() => handleToggleEnabled(alert)}
                        style={{ accentColor: 'var(--border-hero)', width: 14, height: 14 }}
                      />
                      Enrolled
                    </label>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-restraint)',
                        color: 'hsl(0, 60%, 65%)',
                        borderRadius: 2,
                        padding: '6px 14px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em'
                      }}
                    >
                      Purge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}