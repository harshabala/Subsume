import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage, CONNECT_GOOGLE_DRIVE_TIMEOUT_MS } from '@/shared/messages';
import {
  MessageType,
  UserPreferences,
  ImportLibraryData,
  ThemePreference,
  CinemaAtmosphere,
  FreeDataSourceStatus,
  FreeDataSourceId,
} from '@/shared/types';
import { applyThemePreference, applyCinemaAtmosphere, watchSystemTheme } from '@/shared/theme';
import { THEME_LABELS } from '@/shared/themeLabels';
import { AVAILABLE_PLATFORMS } from '@/shared/platforms';
import { AVAILABLE_GENRES } from '@/shared/genres';
import { validateImportData } from '@/shared/validation';
import { CURATOR_JOURNEY_COPY, DEFAULT_PROMPTS } from '@/shared/prompts';
import { SETTINGS_SECTIONS, type SettingsSectionId } from '@/shared/settingsCatalog';
import { SettingsDiagnosticsPanel } from '../components/SettingsDiagnosticsPanel';
import { useNotice } from '../components/NoticeProvider';
import { formatUserError } from '../utils/formatUserError';
import { logDiagnostic } from '@/shared/diagnosticLog';
import '../styles/settings.css';
import '../styles/curator-settings.css';
import '../styles/settings-nav.css';
import '../styles/settings-oauth.css';

export function Settings() {
  const { showNotice } = useNotice();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<FreeDataSourceStatus[] | null>(null);
  const [sourceStatusLoading, setSourceStatusLoading] = useState(true);
  const [curatorPreview, setCuratorPreview] = useState<string | null>(null);
  const [curatorPreviewLoading, setCuratorPreviewLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const oauthRedirectUri =
    typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL
      ? chrome.identity.getRedirectURL()
      : '';

  useEffect(() => {
    async function load() {
      try {
        const res = await sendMessage<{ revealKeys: boolean }, UserPreferences>(
          MessageType.GET_FULL_PREFERENCES,
          { revealKeys: true }
        );
        const loaded = res.data!;
        setPrefs(loaded);
        const theme = loaded.theme ?? 'dark';
        applyThemePreference(theme);
        watchSystemTheme(theme);
        applyCinemaAtmosphere(loaded.cinemaAtmosphere ?? 'default');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load settings.';
        setLoadError(msg);
        logDiagnostic('error', 'settings', msg);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!prefs) return;
    const hash = window.location.hash;
    if (hash === '#ai-curator') {
      setActiveSection('ai');
      requestAnimationFrame(() => {
        document.getElementById('ai-curator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    if (hash === '#diagnostics') {
      setActiveSection('diagnostics');
      requestAnimationFrame(() => {
        document.getElementById('settings-diagnostics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [prefs]);

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
      applyCinemaAtmosphere(prefs.cinemaAtmosphere ?? 'default');
    }
    if (key === 'cinemaAtmosphere') {
      applyCinemaAtmosphere(value as CinemaAtmosphere);
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
      const theme = prefs.theme ?? 'dark';
      applyThemePreference(theme);
      watchSystemTheme(theme);
      applyCinemaAtmosphere(prefs.cinemaAtmosphere ?? 'default');
      showNotice('Settings saved.', 'success');
    } catch (err) {
      showNotice(`Failed to save settings: ${formatUserError(err)}`, 'error');
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
      showNotice(`Failed to export library: ${formatUserError(err)}`, 'error');
    }
  };

  function resetCuratorPrompt(field: keyof Pick<
    UserPreferences,
    'llmCuratorSystemPrompt' | 'llmPromptRecommendation' | 'llmPromptDigest' | 'llmPromptGrouping'
  >) {
    handleChange(field, '');
    setCuratorPreview(null);
  }

  async function loadCuratorPreview() {
    setCuratorPreviewLoading(true);
    try {
      const preview = await sendMessage<{
        systemPrompt: string;
        userPrompt: string;
        tasteProfileJson: string;
        taskPrompt: string;
      }>(MessageType.GET_CURATOR_PROMPT_PREVIEW, {});
      const assembled = [
        '── SYSTEM (persona) ──',
        preview.systemPrompt,
        '',
        '── USER MESSAGE (assembled each run) ──',
        preview.userPrompt,
      ].join('\n');
      setCuratorPreview(assembled);
    } catch (err) {
      console.error('[Subsume] Curator preview failed:', err);
      setCuratorPreview('Could not assemble preview. Save settings and try again.');
    } finally {
      setCuratorPreviewLoading(false);
    }
  }

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
        showNotice('Library imported successfully.', 'success');
      } catch (err: unknown) {
        showNotice(`Failed to import library: ${formatUserError(err)}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleConnectDrive = async () => {
    if (driveConnecting) return;
    setDriveConnecting(true);
    setDriveStatus(
      'Opening Google sign-in… A browser window will open. Works in Chrome and Brave. First connect may take a minute.'
    );
    try {
      const result = (await sendMessage(
        MessageType.CONNECT_GOOGLE_DRIVE,
        {},
        CONNECT_GOOGLE_DRIVE_TIMEOUT_MS
      )) as { email?: string };
      setDriveStatus(
        result?.email
          ? `Connected as ${result.email}`
          : 'Connected to Google Drive. You can back up or restore from this device.'
      );
      logDiagnostic('info', 'settings.drive', 'Connect Google Drive succeeded');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const withRedirect =
        msg.includes('redirect') || msg.includes('Google sign-in failed')
          ? `${msg} Add this exact redirect URI in Google Cloud → OAuth Web client: ${oauthRedirectUri}`
          : msg;
      setDriveStatus(withRedirect);
      logDiagnostic('error', 'settings.drive', withRedirect);
    } finally {
      setDriveConnecting(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      await sendMessage(MessageType.BACKUP_TO_DRIVE, {});
      showNotice('Backup completed.', 'success');
    } catch (e: unknown) {
      showNotice(`Backup failed: ${formatUserError(e)}`, 'error');
    }
  };

  const handleRestoreBackup = async () => {
    try {
      await sendMessage(MessageType.RESTORE_FROM_DRIVE, {});
      showNotice('Restore completed.', 'success');
    } catch (e: unknown) {
      showNotice(`Restore failed: ${formatUserError(e)}`, 'error');
    }
  };

  const handleMergeHighlightCatalogue = async () => {
    try {
      const result = (await sendMessage(MessageType.RESTORE_DEMO_LIBRARY, {})) as {
        mediaAdded?: number;
        libraryAdded?: number;
        libraryUpdated?: number;
      };
      const parts = [
        result.mediaAdded ? `${result.mediaAdded} titles added` : null,
        result.libraryAdded ? `${result.libraryAdded} library rows added` : null,
        result.libraryUpdated ? `${result.libraryUpdated} reflections updated` : null,
      ].filter(Boolean);
      showNotice(
        parts.length ? `Highlight catalogue merged: ${parts.join(', ')}.` : 'Highlight catalogue is already up to date.',
        'success'
      );
    } catch (e: unknown) {
      showNotice(`Merge failed: ${formatUserError(e)}`, 'error');
    }
  };

  if (!prefs) {
    return (
      <div className="page-container settings-loading">
        {loadError ? `Failed to load settings: ${loadError}` : 'Loading settings…'}
      </div>
    );
  }

  return (
    <div className="page-container settings-page">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Settings</span>
        </div>
        <h2 className="sanctuary-title">Settings</h2>
        <p className="sanctuary-description">
          Choose a category below. Each section explains what it controls — no jargon without a plain description.
        </p>
      </header>

      <nav className="settings-section-nav" aria-label="Settings categories">
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`settings-section-nav-btn ${activeSection === section.id ? 'active' : ''}`}
            aria-current={activeSection === section.id ? 'true' : undefined}
            onClick={() => setActiveSection(section.id)}
          >
            {section.title}
          </button>
        ))}
      </nav>

      <p className="settings-section-lead">
        {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.description}
      </p>

      <div className="settings-section-stack">
        {/* Appearance */}
        {activeSection === 'appearance' && (
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Look &amp; atmosphere</h3>
          <div className="settings-field-group">
            <span className="settings-field-label">Theme</span>
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
            <p className="settings-help-text-italic">Preview updates immediately. Save settings to keep your choice.</p>
          </div>

          <div className="settings-field-group">
            <span className="settings-field-label">Color accent</span>
            <div className="settings-chip-grid">
              {([
                { value: 'default', label: 'Default (dark)' },
                { value: 'sunset', label: 'Sunset Boulevard' },
                { value: 'emerald', label: 'Cannes Emerald' },
                { value: 'french', label: 'Midnight French' },
              ] as { value: CinemaAtmosphere; label: string }[]).map((option) => {
                const active = (prefs.cinemaAtmosphere ?? 'default') === option.value;
                return (
                  <label key={option.value} className={`settings-chip ${active ? 'active' : 'inactive'}`}>
                    <input
                      type="radio"
                      name="cinemaAtmosphere"
                      checked={active}
                      onChange={() => handleChange('cinemaAtmosphere', option.value)}
                      className="settings-chip-hidden-input"
                    />
                    <span className={`settings-chip-dot ${active ? 'active' : 'inactive'}`} />
                    {option.label}
                  </label>
                );
              })}
            </div>
            <p className="settings-help-text-italic">
              Atmosphere presets tint the sanctuary palette without changing your light/dark theme.
            </p>
          </div>
        </div>
        )}

        {activeSection === 'taste' && (
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Taste &amp; platforms</h3>
          <p className="settings-panel-description">
            Genres and platforms influence discovery and digests. They do not change what is stored in your sanctuary.
          </p>

          <div className="settings-field-group">
            <span className="settings-field-label">Favorite genres</span>
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
            <span className="settings-field-label">Streaming services</span>
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
        )}

        {activeSection === 'discovery' && (
        <>
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Discovery sources</h3>
          <p className="settings-discovery-intro">
            Subsume layers multiple data sources so discovery works out of the box, with optional keys for deeper catalogue sync.
          </p>
          <div className="settings-discovery-grid">
            <div className="settings-discovery-card">
              <span className="settings-discovery-badge free">Free</span>
              <h4 className="settings-discovery-title">No key required</h4>
              <ul className="settings-discovery-list">
                <li><strong>TVmaze</strong> — TV series metadata, cast, and schedules</li>
                <li><strong>Trakt</strong> — Film &amp; TV search, ratings, and trending</li>
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

        <div className="settings-panel">
          <h3 className="settings-panel-heading">Free source health</h3>
          <p className="settings-help-text settings-source-intro">
            Live status for bundled integrations. Green dots confirm each source is configured and reachable.
          </p>
          <div className="settings-source-list">
            {(['tvmaze', 'trakt', 'wikidata'] as FreeDataSourceId[]).map(renderSourceStatus)}
          </div>
        </div>
        </>
        )}

        {activeSection === 'credentials' && (
        <div className="settings-panel">
          <h3 className="settings-panel-heading">API keys</h3>
          <p className="settings-panel-description">
            Keys stay in your browser. TMDb is recommended for posters and full catalogue sync.
          </p>

          <div className="settings-field-stack">
            <div>
              <label className="settings-field-label">TMDb API key</label>
              <input
                type="password"
                placeholder="Paste your TMDb API key"
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
              <label className="settings-field-label">OMDb API key (optional) (Optional)</label>
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
        )}

        {activeSection === 'ai' && (
        <>
        <div className="settings-panel">
          <h3 className="settings-panel-heading">AI recommendations</h3>
          <p className="settings-panel-description">
            Turn on an LLM you trust. Subsume sends a taste profile JSON plus your instructions — not your whole hard drive.
          </p>

          <div className="settings-field-group">
            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.llmEnabled}
                onChange={(e) => handleChange('llmEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-lg">Enable AI-powered recommendations</span>
            </label>
            <p className="settings-toggle-help">
              Uses your ratings, reflections, and wishlist to suggest films via your chosen provider.
            </p>
          </div>

          {prefs.llmEnabled && (
            <div className="settings-sub-panel">
              <div>
                <label className="settings-field-label">Provider</label>
                <select
                  value={prefs.llmProvider || 'openai'}
                  onChange={(e) => handleChange('llmProvider', e.currentTarget.value)}
                  className="settings-input"
                >
                  <option value="openai" className="sanctuary-select-option">OpenAI</option>
                  <option value="anthropic" className="sanctuary-select-option">Anthropic</option>
                  <option value="gemini" className="sanctuary-select-option">Google Gemini</option>
                </select>
              </div>

              <div>
                <label className="settings-field-label">API key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={prefs.llmApiKey || ''}
                  onChange={(e) => handleChange('llmApiKey', e.currentTarget.value)}
                  className="settings-input"
                />
              </div>

              <div>
                <label className="settings-field-label">Fallback API key (optional)</label>
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

        {/* AI Curator — journey + editable prompts */}
        <div className="settings-panel" id="ai-curator">
          <h3 className="settings-panel-heading">AI curator</h3>
          <p className="settings-panel-description">
            {CURATOR_JOURNEY_COPY.headline}
          </p>
          <ol className="curator-journey-steps">
            {CURATOR_JOURNEY_COPY.steps.map((step) => (
              <li key={step.slice(0, 40)}>{step}</li>
            ))}
          </ol>

          <div className="settings-field-stack">
            <div>
              <label className="settings-field-label">Curator persona (system)</label>
              <textarea
                value={prefs.llmCuratorSystemPrompt ?? ''}
                onChange={(e) => handleChange('llmCuratorSystemPrompt', e.currentTarget.value)}
                placeholder={DEFAULT_PROMPTS.curatorSystem}
                rows={3}
                className="settings-input resize-v font-mono-sm"
              />
              <button
                type="button"
                className="btn-sanctuary-restraint curator-reset-btn"
                onClick={() => resetCuratorPrompt('llmCuratorSystemPrompt')}
              >
                Restore default persona
              </button>
            </div>

            <div>
              <label className="settings-field-label">Recommendations task (after taste JSON)</label>
              <textarea
                value={prefs.llmPromptRecommendation ?? ''}
                onChange={(e) => handleChange('llmPromptRecommendation', e.currentTarget.value)}
                placeholder={DEFAULT_PROMPTS.recommendation}
                rows={10}
                className="settings-input resize-v font-mono-sm"
              />
              <button
                type="button"
                className="btn-sanctuary-restraint curator-reset-btn"
                onClick={() => resetCuratorPrompt('llmPromptRecommendation')}
              >
                Restore default recommendations task
              </button>
            </div>

            <div>
              <label className="settings-field-label">Weekly digest task (new releases)</label>
              <textarea
                value={prefs.llmPromptDigest ?? ''}
                onChange={(e) => handleChange('llmPromptDigest', e.currentTarget.value)}
                placeholder={DEFAULT_PROMPTS.digest}
                rows={8}
                className="settings-input resize-v font-mono-sm"
              />
              <button
                type="button"
                className="btn-sanctuary-restraint curator-reset-btn"
                onClick={() => resetCuratorPrompt('llmPromptDigest')}
              >
                Restore default digest task
              </button>
            </div>

            <div>
              <label className="settings-field-label">Grouping task (“Because you experienced…”)</label>
              <textarea
                value={prefs.llmPromptGrouping ?? ''}
                onChange={(e) => handleChange('llmPromptGrouping', e.currentTarget.value)}
                placeholder={DEFAULT_PROMPTS.grouping}
                rows={6}
                className="settings-input resize-v font-mono-sm"
              />
              <button
                type="button"
                className="btn-sanctuary-restraint curator-reset-btn"
                onClick={() => resetCuratorPrompt('llmPromptGrouping')}
              >
                Restore default grouping task
              </button>
            </div>

            <div className="curator-preview-block">
              <div className="settings-btn-row">
                <button
                  type="button"
                  className="btn-sanctuary-restraint"
                  onClick={loadCuratorPreview}
                  disabled={curatorPreviewLoading}
                >
                  {curatorPreviewLoading ? 'Assembling…' : 'Preview assembled prompt (live taste profile)'}
                </button>
              </div>
              <p className="settings-panel-description">
                Taste profile is built from your sanctuary (watched, ratings, emotional recall, notes, wishlist, filmmakers, genres) and injected as JSON — not edited by hand.
              </p>
              {curatorPreview && (
                <pre className="curator-preview-pre">{curatorPreview}</pre>
              )}
            </div>
          </div>
        </div>
        </>
        )}

        {activeSection === 'browsing' && (
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Browsing &amp; overlays</h3>
          <p className="settings-panel-description">
            Controls how Subsume appears on other websites when you browse Netflix, Letterboxd, and similar pages.
          </p>

          <div className="settings-field-stack">
            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.hoverCardsEnabled}
                onChange={(e) => handleChange('hoverCardsEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-sm">Show hover cards on titles</span>
            </label>

            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.posterOverlaysEnabled ?? true}
                onChange={(e) => handleChange('posterOverlaysEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-sm">Show poster badges</span>
            </label>

            <label className="settings-toggle-label">
              <input
                type="checkbox"
                checked={prefs.screenplayDockEnabled ?? false}
                onChange={(e) => handleChange('screenplayDockEnabled', e.currentTarget.checked)}
                className="settings-toggle-checkbox"
              />
              <span className="settings-toggle-text-sm">Screenplay dock on supported sites</span>
            </label>

            <div>
              <label className="settings-field-label">Title detection on websites</label>
              <select
                value={prefs.detectionSensitivity || 'medium'}
                onChange={(e) => handleChange('detectionSensitivity', (e.target as HTMLSelectElement).value)}
                className="settings-input"
              >
                <option value="low" className="sanctuary-select-option">Restrained — CDN exact matching</option>
                <option value="medium" className="sanctuary-select-option">Standard — Balanced</option>
                <option value="high" className="sanctuary-select-option">Aggressive — match more pages</option>
              </select>
            </div>

            <div>
              <label className="settings-field-label">Sites where Subsume is off (one domain per line)</label>
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
        )}

        {activeSection === 'data' && (
        <div className="settings-panel">
          <h3 className="settings-panel-heading">Backup &amp; sync</h3>
          <p className="settings-panel-description">
            Export a portable JSON of your sanctuary, optionally mirror to Google Drive, or restore from a previous backup.
          </p>

          <div className="settings-field-stack">
            <div>
              <span className="settings-field-label">Remote Storage</span>
              <div className="settings-btn-row">
                <p className="settings-panel-hint">
                  Saves a private backup in your Google account (app data only — not visible in Drive’s main file list).
                  Sign in with your Google account when prompted.
                </p>
                {oauthRedirectUri && (
                  <p className="settings-panel-hint settings-oauth-redirect" title={oauthRedirectUri}>
                    OAuth redirect (add in Google Cloud if connect fails):{' '}
                    <code className="settings-oauth-code">{oauthRedirectUri}</code>
                  </p>
                )}
                <button
                  className="btn-sanctuary-restraint"
                  onClick={handleConnectDrive}
                  disabled={driveConnecting}
                  aria-busy={driveConnecting}
                >
                  {driveConnecting ? 'Connecting…' : 'Connect Google Drive'}
                </button>
                {driveStatus && (
                  <p className={`settings-drive-status ${driveStatus.startsWith('Connected') ? 'ok' : 'err'}`} role="status">
                    {driveStatus}
                  </p>
                )}
                <button className="btn-sanctuary-restraint" onClick={handleBackupNow}>
                  Back up now
                </button>
                <button className="btn-sanctuary-restraint" onClick={handleRestoreBackup}>
                  Restore from Drive
                </button>
              </div>
            </div>

            <div className="settings-section-divider">
              <span className="settings-field-label">Indian cinema highlight catalogue</span>
              <p className="settings-panel-hint">
                Adds Kamal Haasan, Mammootty, Mohanlal, and Tamil picks (Indian, Mudhalvan, Enthiran, Padayappa, etc.) with sample reflections — without wiping your library.
              </p>
              <button type="button" className="btn-sanctuary-restraint" onClick={handleMergeHighlightCatalogue}>
                Merge highlight catalogue
              </button>
            </div>

            <div className="settings-section-divider">
              <span className="settings-field-label">Export and import</span>
              <div className="settings-btn-row">
                <button className="btn-sanctuary-restraint" onClick={handleExport}>
                  Export JSON
                </button>
                <label className="btn-sanctuary-restraint" style={{ margin: 0 }}>
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImport}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeSection === 'diagnostics' && <SettingsDiagnosticsPanel />}
      </div>

      <div className="settings-footer-row settings-footer-sticky">
        <div className="settings-footer-left">
          <button className="btn-sanctuary-restraint" onClick={handleCheckUpdate} disabled={checkingUpdate}>
            {checkingUpdate ? 'Checking…' : 'Check for updates'}
          </button>
          {updateStatus && <span className="settings-update-status">{updateStatus}</span>}
        </div>

        <button className="btn-sanctuary-gold" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
