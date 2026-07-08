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
import '../styles/settings.css';

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
  const [actionError, setActionError] = useState<string | null>(null);

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
      setActionError('Please enter an alert name.');
      return;
    }

    setSaving(true);
    setActionError(null);
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
    setActionError(null);
    try {
      await sendMessage(MessageType.UPDATE_WATCH_ALERT, { alert: updated });
      setAlerts((prev) => prev.map((item) => (item.id === alert.id ? updated : item)));
    } catch (err) {
      console.error('Failed to update alert', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update alert.');
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    try {
      await sendMessage(MessageType.DELETE_WATCH_ALERT, { id });
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    } catch (err) {
      console.error('Failed to delete alert', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete alert.');
    }
  };

  return (
    <div className="page-container alerts-page">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Alerts</span>
        </div>
        <h2 className="sanctuary-title">Watch Alerts</h2>
        <p className="sanctuary-description">Set a programme of genres, platforms, and keywords. We will notify you when new releases fit your marquee.</p>
      </header>

      {actionError && (
        <div className="sanctuary-empty-plaque sanctuary-notice-plaque">
          <p className="sanctuary-plaque-text sanctuary-notice-plaque-text">{actionError}</p>
        </div>
      )}

      <div className="alerts-content">
        <div>
          <button
            onClick={() => setShowForm((value) => !value)}
            className={showForm ? 'btn-sanctuary-restraint sm' : 'btn-sanctuary-gold sm'}
          >
            {showForm ? 'Cancel' : 'Create alert'}
          </button>
        </div>

        {showForm && (
          <div className="alerts-form-panel">
            <h3 className="alerts-form-heading">
              New watch alert
            </h3>

            <div className="alerts-form-fields">
              <div>
                <label className="alerts-field-label">
                  Alert name
                </label>
                <input
                  type="text"
                  placeholder="e.g. A24 Cinema Releases"
                  value={form.name}
                  onInput={(e) =>
                    setForm({ ...form, name: (e.target as HTMLInputElement).value })
                  }
                  className="settings-input"
                />
              </div>

              <div>
                <label className="alerts-field-label">
                  Format
                </label>
                <select
                  value={form.type || 'both'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: (e.target as HTMLSelectElement).value as 'movie' | 'tv' | 'both',
                    })
                  }
                  className="settings-input"
                >
                  <option value="both" className="sanctuary-select-option">Cinema &amp; Series</option>
                  <option value="movie" className="sanctuary-select-option">Cinema Only</option>
                  <option value="tv" className="sanctuary-select-option">Series Only</option>
                </select>
              </div>

              <div>
                <label className="alerts-field-label">
                  Genres
                </label>
                <div className="alerts-chip-grid">
                  {AVAILABLE_GENRES.map((genre) => {
                    const active = (form.genres || []).includes(genre.id);
                    return (
                      <label
                        key={genre.id}
                        className={`alerts-chip ${active ? 'active' : 'inactive'}`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleFormArrayItem('genres', genre.id)}
                          className="alerts-chip-hidden-input"
                        />
                        <span className={`alerts-chip-dot ${active ? 'active' : 'inactive'}`} />
                        {genre.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="alerts-field-label">
                  Platforms
                </label>
                <div className="alerts-chip-grid">
                  {AVAILABLE_PLATFORMS.map((platform) => {
                    const active = (form.platforms || []).includes(platform.id);
                    return (
                      <label
                        key={platform.id}
                        className={`alerts-chip ${active ? 'active' : 'inactive'}`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleFormArrayItem('platforms', platform.id)}
                          className="alerts-chip-hidden-input"
                        />
                        <span className={`alerts-chip-dot ${active ? 'active' : 'inactive'}`} />
                        {platform.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="alerts-field-label">
                  Keyword (optional)
                </label>
                <input
                  type="text"
                  placeholder="Title must include…"
                  value={form.keyword || ''}
                  onInput={(e) =>
                    setForm({ ...form, keyword: (e.target as HTMLInputElement).value })
                  }
                  className="settings-input"
                />
              </div>

              <div>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="btn-sanctuary-gold sm"
                >
                  {saving ? 'Saving…' : 'Create alert'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="alerts-loading">
            Loading alerts…
          </div>
        ) : alerts.length === 0 ? (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">Programme index 00</span>
            <h3 className="sanctuary-plaque-title">No alerts yet</h3>
            <p className="sanctuary-plaque-text">
              Create an alert and we will let you know when new releases match your programme.
            </p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alerts-card ${alert.enabled ? '' : 'disabled'}`}
              >
                <div className="alerts-card-inner">
                  <div>
                    <h3 className="alerts-card-title">{alert.name}</h3>
                    <p className="alerts-card-criteria">
                      {formatAlertCriteria(alert)}
                    </p>
                    <p className="alerts-card-meta">
                      Last checked: {formatTimestamp(alert.lastCheckedAt)}
                      {alert.lastMatchAt
                        ? ` · Last match: ${formatTimestamp(alert.lastMatchAt)}`
                        : ''}
                    </p>
                  </div>

                  <div className="alerts-card-actions">
                    <label className={`alerts-toggle-label ${alert.enabled ? 'enabled' : 'disabled'}`}>
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={() => handleToggleEnabled(alert)}
                        className="alerts-toggle-checkbox"
                      />
                      Active
                    </label>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="btn-sanctuary-danger"
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