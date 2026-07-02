import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import {
  MessageType,
  UserPreferences,
  ImportLibraryData,
  ThemePreference,
  FreeDataSourceStatus,
  FreeDataSourceId,
} from '@/shared/types';
import { applyThemePreference, watchSystemTheme } from '@/shared/theme';
import { THEME_LABELS } from '@/shared/themeLabels';
import { AVAILABLE_PLATFORMS } from '@/shared/platforms';
import { AVAILABLE_GENRES } from '@/shared/genres';
import { validateImportData } from '@/shared/validation';
import '../styles/settings.css';

export function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<FreeDataSourceStatus[] | null>(null);
  const [sourceStatusLoading, setSourceStatusLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await sendMessage<{ revealKeys: boolean }, UserPreferences>(
          MessageType.GET_FULL_PREFERENCES,
          { revealKeys: true }
        );
        setPrefs(res.data!);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings.');
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadSourceStatuses() {
      setSourceStatusLoading(true);
      try {
        const res = await sendMessage<Record<string, never>, FreeDataSourceStatus[]>(
          MessageType.GET_FREE_DATA_SOURCE_STATUS,
          {}
        );
        setSourceStatuses(res.data ?? []);
      } catch {
        setSourceStatuses([]);
      } finally {
        setSourceStatusLoading(false);
      }
    }
    loadSourceStatuses();
  }, []);

  const handleChange = (key: keyof UserPreferences, value: unknown) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value as UserPreferences[keyof UserPreferences] });
    if (key === 'theme') {
      const theme = value as ThemePreference;
      applyThemePreference(theme);
      watchSystemTheme(theme);
    }
  };

  const toggleArrayItem = (key: 'favoriteGenres' | 'platforms', id: string) => {
    if (!prefs) return;
    const current = prefs[key];
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    setPrefs({ ...prefs, [key]: updated });
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await sendMessage(MessageType.SET_PREFERENCES, prefs);
      applyThemePreference(prefs.theme ?? 'dark');
    } catch (err) {
      alert('Failed to save settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const FREE_SOURCE_META: Record<
    FreeDataSourceId,
    { name: string; description: string }
  > = {
    tvmaze: {
      name: 'TVmaze',
      description: 'TV show metadata, cast, and schedules',
    },
    trakt: {
      name: 'Trakt',
      description: 'Ratings, trending, and recommendations',
    },
    wikidata: {
      name: 'Wikidata / Wikipedia',
      description: 'Director bios and plot summaries',
    },
  };

  function renderSourceStatus(id: FreeDataSourceId) {
    const meta = FREE_SOURCE_META[id];
    const status = sourceStatuses?.find((s) => s.id === id);
    const configured = status?.configured ?? true;
    const working = status?.working ?? false;

    return (
      <div key={id} className="settings-source-row">
        <div className="settings-source-info">
          <span className="settings-source-name">{meta.name}</span>
          <span className="settings-source-desc">{meta.description}</span>
        </div>
        <div className="settings-source-dots">
          <span className="settings-source-dot-group" title={configured ? 'Configured' : 'Not configured'}>
            <span className={`settings-status-dot ${configured ? 'configured' : 'inactive'}`} />
            <span className="settings-status-label">Configured</span>
          </span>
          <span
            className="settings-source-dot-group"
            title={
              sourceStatusLoading
                ? 'Checking connection…'
                : working
                  ? 'Reachable'
                  : 'Unreachable'
            }
          >
            <span
              className={`settings-status-dot ${
                sourceStatusLoading ? 'pending' : working ? 'working' : 'inactive'
              }`}
            />
            <span className="settings-status-label">Working</span>
          </span>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    try {
      const res = await sendMessage(MessageType.EXPORT_LIBRARY, {});
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "subsume_library.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    } catch (err) {
      alert('Failed to export library: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.requestUpdateCheck) {
      chrome.runtime.requestUpdateCheck((status) => {
        setCheckingUpdate(false);
        if (chrome.runtime.lastError) {
          setUpdateStatus(chrome.runtime.lastError.message || 'Update check not supported.');
          return;
        }
        if (status === 'no_update') {
          setUpdateStatus('Up to date');
        } else if (status === 'update_available') {
          setUpdateStatus('Update available!');
        } else if (status === 'throttled') {
          setUpdateStatus('Throttled. Please try again later.');
        } else {
          setUpdateStatus(`Status: ${status}`);
        }
      });
    } else {
      setCheckingUpdate(false);
      setUpdateStatus('Update check not supported.');
    }
  };

  const handleImport = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const data = validateImportData(raw);
        await sendMessage(MessageType.IMPORT_LIBRARY, data);
        alert('Library imported successfully!');
      } catch (err: unknown) {
        alert('Failed to import library: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleConnectDrive = async () => {
    try {
      await sendMessage(MessageType.CONNECT_GOOGLE_DRIVE, {});
      alert('Successfully connected to Google Drive!');
    } catch (e: unknown) {
      alert('Failed to connect to Google Drive: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleBackupNow = async () => {
    try {
      await sendMessage(MessageType.BACKUP_TO_DRIVE, {});
      alert('Backup successful!');
    } catch (e: unknown) {
      alert('Backup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleRestoreBackup = async () => {
    try {
      await sendMessage(MessageType.RESTORE_FROM_DRIVE, {});
      alert('Restore successful!');
    } catch (e: unknown) {
      alert('Restore failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  if (!prefs) {
    return (
      <div className="page-container settings-loading">
        {loadError ? `Failed to load settings: ${loadError}` : 'Warming sanctuary instruments...'}
      </div>
    );
  }

  return (
    <div className="page-container settings-page">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Sanctuary Configuration</span>
        </div>
        <h2 className="sanctuary-title">Instrument Settings</h2>
        <p className="sanctuary-description">Configure the acoustic and visual restraints of your private cinematic sanctuary.</p>
      </header>

      <div className="settings-section-stack">
        {/* Appearance */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Appearance</h3>
          <div className="settings-field-group">
            <span className="settings-field-label">Sanctuary Theme</span>
            <div className="settings-chip-grid">
              {(['dark', 'light', 'system'] as ThemePreference[]).map((theme) => {
                const active = (prefs.theme ?? 'dark') === theme;
                return (
                  <label key={theme} className={`settings-chip ${active ? 'active' : 'inactive'}`}>
                    <input
                      type="radio"
                      name="theme"
                      checked={active}
                      onChange={() => handleChange('theme', theme)}
                      className="settings-chip-hidden-input"
                    />
                    <span className={`settings-chip-dot ${active ? 'active' : 'inactive'}`} />
                    {THEME_LABELS[theme]}
                  </label>
                );
              })}
            </div>
            <p className="settings-help-text-italic">Preview updates immediately. Engrave Settings to persist your choice.</p>
          </div>
        </div>

        {/* Content Preferences */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Taxonomy &amp; Curation Preferences</h3>

          <div className="settings-field-group">
            <span className="settings-field-label">Archival Genres</span>
            <div className="settings-chip-grid">
              {AVAILABLE_GENRES.map(g => {
                const active = prefs.favoriteGenres.includes(g.id);
                return (
                  <label key={g.id} className={`settings-chip ${active ? 'active' : 'inactive'}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleArrayItem('favoriteGenres', g.id)}
                      className="settings-chip-hidden-input"
                    />
                    <span className={`settings-chip-dot ${active ? 'active' : 'inactive'}`} />
                    {g.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <span className="settings-field-label">Sanctuary Platforms</span>
            <div className="settings-chip-grid">
              {AVAILABLE_PLATFORMS.map(p => {
                const active = prefs.platforms.includes(p.id);
                return (
                  <label key={p.id} className={`settings-chip ${active ? 'active' : 'inactive'}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleArrayItem('platforms', p.id)}
                      className="settings-chip-hidden-input"
                    />
                    <span className={`settings-chip-dot ${active ? 'active' : 'inactive'}`} />
                    {p.name}
                  </label>
                );
              })}
            </div>
            <p className="settings-help-text-italic">Used to tailor your private curation feed.</p>
          </div>
        </div>

        {/* Discovery */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Discovery</h3>
          <p className="settings-discovery-intro">
            Subsume layers multiple data sources so discovery works out of the box, with optional keys for deeper catalogue sync.
          </p>
          <div className="settings-discovery-grid">
            <div className="settings-discovery-card">
              <span className="settings-discovery-badge free">Free</span>
              <h4 className="settings-discovery-title">No key required</h4>
              <ul className="settings-discovery-list">
                <li><strong>TVmaze</strong> — TV metadata when TMDb is unavailable</li>
                <li><strong>Trakt</strong> — Ratings and trending recommendations</li>
                <li><strong>Wikidata / Wikipedia</strong> — Plot summaries and director bios</li>
              </ul>
            </div>
            <div className="settings-discovery-card">
              <span className="settings-discovery-badge key">Key required</span>
              <h4 className="settings-discovery-title">Your credentials</h4>
              <ul className="settings-discovery-list">
                <li><strong>TMDb</strong> — Full movie &amp; TV catalogue sync (recommended)</li>
                <li><strong>OMDb</strong> — Optional reception and ratings enrichment</li>
                <li><strong>LLM provider</strong> — Personalized recommendations when enabled</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Free API Status */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Free Data Sources (No Key Required)</h3>
          <p className="settings-help-text settings-source-intro">
            Live status for bundled integrations. Green dots confirm each source is configured and reachable.
          </p>
          <div className="settings-source-list">
            {(['tvmaze', 'trakt', 'wikidata'] as FreeDataSourceId[]).map(renderSourceStatus)}
          </div>
        </div>

        {/* API Configuration */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Archive Credentials (API)</h3>

          <div className="settings-field-stack">
            <div>
              <label className="settings-field-label">TMDb Archival Key</label>
              <input
                type="password"
                placeholder="Enter TMDb v3 credential"
                value={prefs.tmdbApiKey || ''}
                onChange={(e) => handleChange('tmdbApiKey', e.currentTarget.value)}
                className="settings-input"
              />
              <p className="settings-help-text">
                Required for catalogue synchronization. Acquire credential at{' '}
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" className="settings-api-link">themoviedb.org</a>.
              </p>
            </div>

            <div>
              <label className="settings-field-label">OMDb Archival Key (Optional)</label>
              <input
                type="password"
                placeholder="Enter OMDb credential"
                value={prefs.omdbApiKey || ''}
                onChange={(e) => handleChange('omdbApiKey', e.currentTarget.value)}
                className="settings-input"
              />
              <p className="settings-help-text">
                Enriches archival records with supplementary reception plates. Acquire credential at{' '}
                <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener" className="settings-api-link">omdbapi.com</a>.
              </p>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Cognitive Reflection Engine</h3>

          <div className="settings-field-group">
            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.llmEnabled}
                onChange={(e) => handleChange('llmEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-lg">Engage cognitive synthesis for recommendations</span>
            </label>
            <p className="settings-toggle-help">
              Invokes neural evaluation to assemble resonant cinematic pathways matching your private reflections.
            </p>
          </div>

          {prefs.llmEnabled && (
            <div className="settings-sub-panel">
              <div>
                <label className="settings-field-label">Neural Architecture</label>
                <select
                  value={prefs.llmProvider || 'openai'}
                  onChange={(e) => handleChange('llmProvider', e.currentTarget.value)}
                  className="settings-input"
                >
                  <option value="openai" className="sanctuary-select-option">OpenAI (GPT-4 Sanctuary)</option>
                  <option value="anthropic" className="sanctuary-select-option">Anthropic (Claude Obscura)</option>
                  <option value="gemini" className="sanctuary-select-option">Google (Gemini Synthesis)</option>
                </select>
              </div>

              <div>
                <label className="settings-field-label">Primary Neural Credential</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={prefs.llmApiKey || ''}
                  onChange={(e) => handleChange('llmApiKey', e.currentTarget.value)}
                  className="settings-input"
                />
              </div>

              <div>
                <label className="settings-field-label">Fallback Credential</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={prefs.llmSecondaryApiKey || ''}
                  onChange={(e) => handleChange('llmSecondaryApiKey', e.currentTarget.value)}
                  className="settings-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Page Scanning */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Surface Inspection Instruments</h3>

          <div className="settings-field-stack">
            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.hoverCardsEnabled}
                onChange={(e) => handleChange('hoverCardsEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-sm">Project Hover Inspection Cards</span>
            </label>

            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.posterOverlaysEnabled ?? true}
                onChange={(e) => handleChange('posterOverlaysEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-sm">Superimpose Archival Badges on Posters</span>
            </label>

            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.screenplayDockEnabled ?? false}
                onChange={(e) => handleChange('screenplayDockEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-sm">Enable Auteur Screenplay Dock</span>
            </label>

            <div>
              <label className="settings-field-label">Inspection Sensitivity</label>
              <select
                value={prefs.detectionSensitivity || 'medium'}
                onChange={(e) => handleChange('detectionSensitivity', (e.target as HTMLSelectElement).value)}
                className="settings-input"
              >
                <option value="low" className="sanctuary-select-option">Restrained — CDN exact matching</option>
                <option value="medium" className="sanctuary-select-option">Standard — Archival balance</option>
                <option value="high" className="sanctuary-select-option">Omnipresent — Aggressive scanning</option>
              </select>
            </div>

            <div>
              <label className="settings-field-label">Sanctuary Silenced Domains</label>
              <textarea
                value={prefs.disabledDomains?.join('\n') || ''}
                onChange={(e) => handleChange('disabledDomains', e.currentTarget.value.split('\n').map(d => d.trim()).filter(Boolean))}
                placeholder={'example.com\nnews.ycombinator.com'}
                rows={3}
                className="settings-input resize-v"
              />
            </div>
          </div>
        </div>

        {/* Cloud Sync & Data Management */}
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Preservation &amp; Sync Colophon</h3>

          <div className="settings-field-stack">
            <div>
              <span className="settings-field-label">Remote Storage</span>
              <div className="settings-btn-row">
                <button className="btn-sanctuary-restraint" onClick={handleConnectDrive}>
                  Engage Google Drive
                </button>
                <button className="btn-sanctuary-restraint" onClick={handleBackupNow}>
                  Execute Vault Backup
                </button>
                <button className="btn-sanctuary-restraint" onClick={handleRestoreBackup}>
                  Restore from Vault
                </button>
              </div>
            </div>

            <div className="settings-section-divider">
              <span className="settings-field-label">Local Archive Portability</span>
              <div className="settings-btn-row">
                <button className="btn-sanctuary-restraint" onClick={handleExport}>
                  Export Ledger (JSON)
                </button>
                <label className="btn-sanctuary-restraint" style={{ margin: 0 }}>
                  Import Ledger (JSON)
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImport}
                  />
                </label>
              </div>
            </div>

            <div className="settings-footer-row">
              <div className="settings-footer-left">
                <button className="btn-sanctuary-restraint" onClick={handleCheckUpdate} disabled={checkingUpdate}>
                  {checkingUpdate ? 'Inspecting...' : 'Check Instrument Version'}
                </button>
                {updateStatus && <span className="settings-update-status">{updateStatus}</span>}
              </div>

              <button className="btn-sanctuary-gold" onClick={save} disabled={saving}>
                {saving ? 'Engraving...' : 'Engrave Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
