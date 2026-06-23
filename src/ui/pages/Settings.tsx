import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, UserPreferences, ImportLibraryData } from '@/shared/types';
import { AVAILABLE_PLATFORMS } from '@/shared/platforms';
import { AVAILABLE_GENRES } from '@/shared/genres';
import { validateImportData } from '@/shared/validation';
import { getAuthToken, uploadDatabaseBackup, downloadDatabaseBackup } from '@/background/drive-sync';
import '../styles/settings.css';

export function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await sendMessage<any, UserPreferences>(MessageType.GET_FULL_PREFERENCES, {});
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    }
    load();
  }, []);

  const handleChange = (key: keyof UserPreferences, value: any) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
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
    await sendMessage(MessageType.SET_PREFERENCES, prefs);
    setSaving(false);
  };

  const handleExport = async () => {
    const res = await sendMessage(MessageType.EXPORT_LIBRARY, {});
    if (!res.success || !res.data) {
      alert('Failed to export library');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "subsume_library.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.requestUpdateCheck) {
      chrome.runtime.requestUpdateCheck((status) => {
        setCheckingUpdate(false);
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

  const handleImport = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const data = validateImportData(raw);
        await sendMessage(MessageType.IMPORT_LIBRARY, data);
        alert('Library imported successfully!');
      } catch (err: any) {
        alert('Failed to import library: ' + (err?.message || err));
      }
    };
    reader.readAsText(file);
  };

  const handleConnectDrive = async () => {
    try {
      await getAuthToken(true);
      alert('Successfully connected to Google Drive!');
    } catch (e: any) {
      alert('Failed to connect to Google Drive: ' + e.message);
    }
  };

  const handleBackupNow = async () => {
    try {
      const res = await sendMessage(MessageType.EXPORT_LIBRARY, {});
      if (!res.success || !res.data) throw new Error('Failed to export local data');
      await uploadDatabaseBackup(JSON.stringify(res.data));
      alert('Backup successful!');
    } catch (e: any) {
      alert('Backup failed: ' + e.message);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const jsonString = await downloadDatabaseBackup();
      const raw = JSON.parse(jsonString);
      const data = validateImportData(raw);
      await sendMessage(MessageType.IMPORT_LIBRARY, data);
      alert('Restore successful!');
    } catch (e: any) {
      alert('Restore failed: ' + e.message);
    }
  };

  if (!prefs) {
    return <div className="page-container p-6">Loading settings...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Configure how Subsume works.</p>
      </header>

      <div className="settings-section settings-content">
        <h3 className="settings-heading">Content Preferences</h3>
        
        <div className="settings-group">
          <label className="settings-label">Favorite Genres</label>
          <div className="settings-checkbox-group">
            {AVAILABLE_GENRES.map(g => (
              <label key={g.id} className="settings-checkbox-item">
                <input 
                  type="checkbox"
                  checked={prefs.favoriteGenres.includes(g.id)}
                  onChange={() => toggleArrayItem('favoriteGenres', g.id)}
                  className="settings-checkbox"
                />
                <span className="settings-checkbox-text">{g.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Streaming Services</label>
          <div className="settings-checkbox-group">
            {AVAILABLE_PLATFORMS.map(p => (
              <label key={p.id} className="settings-checkbox-item">
                <input 
                  type="checkbox"
                  checked={prefs.platforms.includes(p.id)}
                  onChange={() => toggleArrayItem('platforms', p.id)}
                  className="settings-checkbox"
                />
                <span className="settings-checkbox-text">{p.name}</span>
              </label>
            ))}
          </div>
          <p className="settings-help-text mt-8">Used to personalize your New Releases feed.</p>
        </div>

        <hr className="settings-divider" />

        <h3 className="settings-heading">API Configuration</h3>
        
        <div className="settings-group">
          <label className="settings-label">TMDB API Key</label>
          <input 
            type="password"
            placeholder="Enter your TMDb API key"
            value={prefs.tmdbApiKey || ''}
            onChange={(e) => handleChange('tmdbApiKey', e.currentTarget.value)}
            className="settings-input"
          />
          <p className="settings-help-text">
            Required for fetching movie and TV show data. Get a free key at{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" className="settings-link">themoviedb.org</a>.
          </p>
        </div>

        <div className="settings-group">
          <label className="settings-label">OMDb API Key (optional)</label>
          <input
            type="password"
            placeholder="Enter your OMDb API key"
            value={prefs.omdbApiKey || ''}
            onChange={(e) => handleChange('omdbApiKey', e.currentTarget.value)}
            className="settings-input"
          />
          <p className="settings-help-text">
            Optional. Enriches titles with IMDb and Rotten Tomatoes ratings. Get a free key at{' '}
            <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener" className="settings-link">omdbapi.com</a>.
          </p>
        </div>

        <hr className="settings-divider" />

        <h3 className="settings-heading">AI Recommendations</h3>
        
        <div className="settings-group">
          <label className="settings-toggle-label">
            <input 
              type="checkbox" 
              checked={prefs.llmEnabled}
              onChange={(e) => handleChange('llmEnabled', e.currentTarget.checked)}
              className="settings-toggle-checkbox"
            />
            <span className="settings-toggle-text">Enable LLM-enhanced recommendations</span>
          </label>
          <p className="settings-help-text-indented">
            Uses an external AI model to provide highly personalized recommendations based on your exact watch history, instead of basic rule-based parsing.
          </p>
        </div>

        {prefs.llmEnabled && (
          <div className="settings-sub-section">
            <div className="settings-group">
              <label className="settings-label">AI Provider</label>
              <select 
                value={prefs.llmProvider || 'openai'}
                onChange={(e) => handleChange('llmProvider', e.currentTarget.value)}
                className="settings-input"
              >
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google (Gemini)</option>
              </select>
            </div>

            <div className="settings-group">
              <label className="settings-label">API Key</label>
              <input 
                type="password"
                placeholder="sk-..."
                value={prefs.llmApiKey || ''}
                onChange={(e) => handleChange('llmApiKey', e.currentTarget.value)}
                className="settings-input"
              />
              <p className="settings-help-text">
                Your API key is stored locally in your browser extension storage and is never sent to our servers. 
                Note: Extension storage is not fully secure against local access.
              </p>
            </div>

            <div className="settings-group">
              <label className="settings-label">Secondary API Key (Fallback)</label>
              <input 
                type="password"
                placeholder="sk-..."
                value={prefs.llmSecondaryApiKey || ''}
                onChange={(e) => handleChange('llmSecondaryApiKey', e.currentTarget.value)}
                className="settings-input"
              />
              <p className="settings-help-text">
                Used automatically if your primary API key hits a rate limit.
              </p>
            </div>
          </div>
        )}

        <hr className="settings-divider" />

        <h3 className="settings-heading">Page Scanning</h3>
        
        <div className="settings-group">
          <label className="settings-toggle-label">
            <input 
              type="checkbox" 
              checked={prefs.hoverCardsEnabled}
              onChange={(e) => handleChange('hoverCardsEnabled', e.currentTarget.checked)}
              className="settings-toggle-checkbox"
            />
            <span className="settings-toggle-text">Show Hover Cards</span>
          </label>
          <p className="settings-help-text-indented">
            Automatically detect movie and TV show titles on web pages and display an interactive card when hovering over them.
          </p>
        </div>

        <div className="settings-group">
          <label className="settings-toggle-label">
            <input
              type="checkbox"
              checked={prefs.posterOverlaysEnabled ?? true}
              onChange={(e) => handleChange('posterOverlaysEnabled', e.currentTarget.checked)}
              className="settings-toggle-checkbox"
            />
            <span className="settings-toggle-text">Show Poster Rating Badges</span>
          </label>
          <p className="settings-help-text-indented">
            Overlay ratings and a quick-add button directly on movie posters while you browse.
          </p>
        </div>

        <div className="settings-group">
          <label className="settings-label">Detection Sensitivity</label>
          <select
            value={prefs.detectionSensitivity || 'medium'}
            onChange={(e) => handleChange('detectionSensitivity', (e.target as HTMLSelectElement).value)}
            className="settings-input-small"
          >
            <option value="low">Low — TMDb CDN posters only</option>
            <option value="medium">Medium — CDN + alt text (recommended)</option>
            <option value="high">High — aggressive matching</option>
          </select>
          <p className="settings-help-text">
            Higher sensitivity finds more posters but may occasionally match non-movie images.
          </p>
        </div>

        <div className="settings-group">
          <label className="settings-label">Disabled Domains</label>
          <textarea
            value={prefs.disabledDomains?.join('\n') || ''}
            onChange={(e) => handleChange('disabledDomains', e.currentTarget.value.split('\n').map(d => d.trim()).filter(Boolean))}
            placeholder={'example.com\nnews.ycombinator.com'}
            rows={3}
            className="settings-input textarea"
          />
          <p className="settings-help-text">
            Hover cards will not appear on these domains. Enter one domain per line.
          </p>
        </div>

        <hr className="settings-divider" />

        <h3 className="settings-heading">About</h3>
        
        <div className="settings-group">
          <label className="settings-label">Extension Updates</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <button 
              className="btn btn-secondary settings-action-btn"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              style={{ width: 'auto', marginBottom: 0 }}
            >
              {checkingUpdate ? 'Checking...' : 'Check for Updates'}
            </button>
            {updateStatus && (
              <span className="settings-help-text" style={{ marginTop: 0 }}>{updateStatus}</span>
            )}
          </div>
        </div>

        <hr className="settings-divider" />

        <h3 className="settings-heading">Cloud Sync</h3>
        
        <div className="settings-button-group">
          <button 
            className="btn btn-secondary settings-action-btn"
            onClick={handleConnectDrive}
          >
            Connect to Google Drive
          </button>
          
          <button 
            className="btn btn-secondary settings-action-btn"
            onClick={handleBackupNow}
          >
            Backup Now
          </button>

          <button 
            className="btn btn-secondary settings-action-btn"
            onClick={handleRestoreBackup}
          >
            Restore Backup
          </button>
        </div>

        <hr className="settings-divider" />

        <h3 className="settings-heading">Data Management</h3>
        
        <div className="settings-button-group">
          <button 
            className="btn btn-secondary settings-action-btn"
            onClick={handleExport}
          >
            Export Library JSON
          </button>
          
          <label className="btn btn-secondary settings-action-btn-label">
            Import Library JSON
            <input 
              type="file" 
              accept=".json" 
              className="settings-file-input"
              onChange={handleImport} 
            />
          </label>
        </div>

        <div className="settings-save-group">
          <button 
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
