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

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">Watch Alerts</h2>
        <p className="page-subtitle">
          Get notified when new releases match your criteria.
        </p>
      </header>

      <div style={{ margin: '0 32px 24px', maxWidth: 720 }}>
        <button
          className="btn-primary"
          onClick={() => setShowForm((value) => !value)}
          style={{ marginBottom: 20 }}
        >
          {showForm ? 'Cancel' : 'Create Alert'}
        </button>

        {showForm && (
          <div
            className="settings-section"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>New Alert</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Alert Name
              </label>
              <input
                type="text"
                placeholder="e.g. Netflix Sci-Fi"
                value={form.name}
                onInput={(e) =>
                  setForm({ ...form, name: (e.target as HTMLInputElement).value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: 6,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Type
              </label>
              <select
                value={form.type || 'both'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: (e.target as HTMLSelectElement).value as 'movie' | 'tv' | 'both',
                  })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: 6,
                }}
              >
                <option value="both">Movies & TV</option>
                <option value="movie">Movies only</option>
                <option value="tv">TV only</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Genres
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AVAILABLE_GENRES.map((genre) => (
                  <label
                    key={genre.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255,255,255,0.05)',
                      padding: '6px 12px',
                      borderRadius: 16,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(form.genres || []).includes(genre.id)}
                      onChange={() => toggleFormArrayItem('genres', genre.id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: 13 }}>{genre.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Platforms
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AVAILABLE_PLATFORMS.map((platform) => (
                  <label
                    key={platform.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255,255,255,0.05)',
                      padding: '6px 12px',
                      borderRadius: 16,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(form.platforms || []).includes(platform.id)}
                      onChange={() => toggleFormArrayItem('platforms', platform.id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: 13 }}>{platform.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Keyword (optional)
              </label>
              <input
                type="text"
                placeholder="Title must contain..."
                value={form.keyword || ''}
                onInput={(e) =>
                  setForm({ ...form, keyword: (e.target as HTMLInputElement).value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: 6,
                }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Alert'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="subsume-spinner" />
            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>
              Loading alerts...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3 className="empty-state-title">No alerts yet</h3>
            <p className="empty-state-description">
              Create an alert to get notified when new movies or shows match your
              genres, platforms, or keywords.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 16,
                  opacity: alert.enabled ? 1 : 0.65,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, marginBottom: 6 }}>{alert.name}</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {formatAlertCriteria(alert)}
                    </p>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 12,
                        marginTop: 8,
                      }}
                    >
                      Last checked: {formatTimestamp(alert.lastCheckedAt)}
                      {alert.lastMatchAt
                        ? ` · Last match: ${formatTimestamp(alert.lastMatchAt)}`
                        : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={() => handleToggleEnabled(alert)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      Enabled
                    </label>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f87171',
                        borderRadius: 6,
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Delete
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