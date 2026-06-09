import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, UserPreferences, ImportLibraryData } from '@/shared/types';
import { AVAILABLE_PLATFORMS } from '@/shared/platforms';
import { AVAILABLE_GENRES } from '@/shared/genres';

export function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);

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

  const validateImportData = (data: unknown): ImportLibraryData => {
    if (!data || typeof data !== 'object') {
      throw new Error('Import file must be a JSON object');
    }
    const d = data as Record<string, unknown>;

    if (d.library !== undefined && !Array.isArray(d.library)) {
      throw new Error('"library" must be an array');
    }
    if (d.media !== undefined && !Array.isArray(d.media)) {
      throw new Error('"media" must be an array');
    }
    if (d.alerts !== undefined && !Array.isArray(d.alerts)) {
      throw new Error('"alerts" must be an array');
    }
    if (d.weeklyDigest !== undefined && (typeof d.weeklyDigest !== 'object' || d.weeklyDigest === null)) {
      throw new Error('"weeklyDigest" must be an object');
    }

    const validStatuses = ['to-watch', 'watching', 'watched', 'abandoned'];
    const validTypes = ['movie', 'tv'];
    const validAlertTypes = ['movie', 'tv', 'both'];

    if (Array.isArray(d.library)) {
      for (let i = 0; i < d.library.length; i++) {
        const item = d.library[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`library[${i}] is not an object`);
        }
        const l = item as Record<string, unknown>;
        if (typeof l.mediaId !== 'string') {
          throw new Error(`library[${i}].mediaId must be a string`);
        }
        if (!validStatuses.includes(l.status as string)) {
          throw new Error(`library[${i}].status must be one of: ${validStatuses.join(', ')}`);
        }
        if (typeof l.addedAt !== 'number') {
          throw new Error(`library[${i}].addedAt must be a number (timestamp)`);
        }
        if (typeof l.updatedAt !== 'number') {
          throw new Error(`library[${i}].updatedAt must be a number (timestamp)`);
        }
        if (l.userRating !== undefined && (typeof l.userRating !== 'number' || l.userRating < 1 || l.userRating > 10)) {
          throw new Error(`library[${i}].userRating must be a number between 1 and 10`);
        }
      }
    }

    if (Array.isArray(d.media)) {
      for (let i = 0; i < d.media.length; i++) {
        const item = d.media[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`media[${i}] is not an object`);
        }
        const m = item as Record<string, unknown>;
        if (typeof m.id !== 'string') {
          throw new Error(`media[${i}].id must be a string`);
        }
        if (typeof m.canonicalTitle !== 'string') {
          throw new Error(`media[${i}].canonicalTitle must be a string`);
        }
        if (!validTypes.includes(m.type as string)) {
          throw new Error(`media[${i}].type must be "movie" or "tv"`);
        }
        if (typeof m.year !== 'number') {
          throw new Error(`media[${i}].year must be a number`);
        }
        if (!Array.isArray(m.genres)) {
          throw new Error(`media[${i}].genres must be an array of strings`);
        }
        if (!Array.isArray(m.ratings)) {
          throw new Error(`media[${i}].ratings must be an array`);
        }
        if (!Array.isArray(m.providers)) {
          throw new Error(`media[${i}].providers must be an array`);
        }
        if (typeof m.posterUrl !== 'string') {
          throw new Error(`media[${i}].posterUrl must be a string`);
        }
      }
    }

    if (Array.isArray(d.alerts)) {
      for (let i = 0; i < d.alerts.length; i++) {
        const item = d.alerts[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`alerts[${i}] is not an object`);
        }
        const alert = item as Record<string, unknown>;
        if (typeof alert.id !== 'string') {
          throw new Error(`alerts[${i}].id must be a string`);
        }
        if (typeof alert.name !== 'string') {
          throw new Error(`alerts[${i}].name must be a string`);
        }
        if (typeof alert.enabled !== 'boolean') {
          throw new Error(`alerts[${i}].enabled must be a boolean`);
        }
        if (typeof alert.createdAt !== 'number') {
          throw new Error(`alerts[${i}].createdAt must be a number (timestamp)`);
        }
        if (alert.type !== undefined && !validAlertTypes.includes(alert.type as string)) {
          throw new Error(`alerts[${i}].type must be one of: ${validAlertTypes.join(', ')}`);
        }
        if (alert.genres !== undefined && !Array.isArray(alert.genres)) {
          throw new Error(`alerts[${i}].genres must be an array of strings`);
        }
        if (alert.platforms !== undefined && !Array.isArray(alert.platforms)) {
          throw new Error(`alerts[${i}].platforms must be an array of strings`);
        }
        if (alert.keyword !== undefined && typeof alert.keyword !== 'string') {
          throw new Error(`alerts[${i}].keyword must be a string`);
        }
        if (alert.lastNotifiedMediaIds !== undefined && !Array.isArray(alert.lastNotifiedMediaIds)) {
          throw new Error(`alerts[${i}].lastNotifiedMediaIds must be an array of strings`);
        }
      }
    }

    if (d.weeklyDigest) {
      const digest = d.weeklyDigest as Record<string, unknown>;
      if (typeof digest.generatedAt !== 'number') {
        throw new Error('weeklyDigest.generatedAt must be a number (timestamp)');
      }
      if (typeof digest.llmGenerated !== 'boolean') {
        throw new Error('weeklyDigest.llmGenerated must be a boolean');
      }
      if (!Array.isArray(digest.items)) {
        throw new Error('weeklyDigest.items must be an array');
      }
      for (let i = 0; i < digest.items.length; i++) {
        const item = digest.items[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`weeklyDigest.items[${i}] is not an object`);
        }
        const entry = item as Record<string, unknown>;
        if (typeof entry.mediaId !== 'string') {
          throw new Error(`weeklyDigest.items[${i}].mediaId must be a string`);
        }
        if (typeof entry.title !== 'string') {
          throw new Error(`weeklyDigest.items[${i}].title must be a string`);
        }
        if (typeof entry.year !== 'number') {
          throw new Error(`weeklyDigest.items[${i}].year must be a number`);
        }
        if (!validTypes.includes(entry.type as string)) {
          throw new Error(`weeklyDigest.items[${i}].type must be "movie" or "tv"`);
        }
        if (typeof entry.reason !== 'string') {
          throw new Error(`weeklyDigest.items[${i}].reason must be a string`);
        }
        if (!Array.isArray(entry.platforms)) {
          throw new Error(`weeklyDigest.items[${i}].platforms must be an array of strings`);
        }
      }
    }

    return {
      library: d.library as ImportLibraryData['library'],
      media: d.media as ImportLibraryData['media'],
      people: d.people as ImportLibraryData['people'],
      alerts: d.alerts as ImportLibraryData['alerts'],
      weeklyDigest: d.weeklyDigest as ImportLibraryData['weeklyDigest'],
    };
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

  if (!prefs) {
    return <div className="page-container p-6">Loading settings...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Configure how Subsume works.</p>
      </header>

      <div className="settings-section" style={{ maxWidth: 600, margin: '24px 32px' }}>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Content Preferences</h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Favorite Genres</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_GENRES.map(g => (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 16, cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={prefs.favoriteGenres.includes(g.id)}
                  onChange={() => toggleArrayItem('favoriteGenres', g.id)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: 13 }}>{g.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Streaming Services</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_PLATFORMS.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 16, cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={prefs.platforms.includes(p.id)}
                  onChange={() => toggleArrayItem('platforms', p.id)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: 13 }}>{p.name}</span>
              </label>
            ))}
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 8 }}>Used to personalize your New Releases feed.</p>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '32px 0' }} />

        <h3 style={{ fontSize: 18, marginBottom: 16 }}>API Configuration</h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>TMDB API Key</label>
          <input 
            type="password"
            placeholder="Enter your TMDb API key"
            value={prefs.tmdbApiKey || ''}
            onChange={(e) => handleChange('tmdbApiKey', e.currentTarget.value)}
            style={{ width: '100%', padding: '10px', background: 'var(--color-surface-hover)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6 }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 6 }}>
            Required for fetching movie and TV show data. Get a free key at{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>themoviedb.org</a>.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>OMDb API Key (optional)</label>
          <input
            type="password"
            placeholder="Enter your OMDb API key"
            value={prefs.omdbApiKey || ''}
            onChange={(e) => handleChange('omdbApiKey', e.currentTarget.value)}
            style={{ width: '100%', padding: '10px', background: 'var(--color-surface-hover)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6 }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 6 }}>
            Optional. Enriches titles with IMDb and Rotten Tomatoes ratings. Get a free key at{' '}
            <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>omdbapi.com</a>.
          </p>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '32px 0' }} />

        <h3 style={{ fontSize: 18, marginBottom: 16 }}>AI Recommendations</h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={prefs.llmEnabled}
              onChange={(e) => handleChange('llmEnabled', e.currentTarget.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: 15, fontWeight: 500 }}>Enable LLM-enhanced recommendations</span>
          </label>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4, marginLeft: 30 }}>
            Uses an external AI model to provide highly personalized recommendations based on your exact watch history, instead of basic rule-based parsing.
          </p>
        </div>

        {prefs.llmEnabled && (
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginLeft: 30 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>AI Provider</label>
              <select 
                value={prefs.llmProvider || 'openai'}
                onChange={(e) => handleChange('llmProvider', e.currentTarget.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--color-surface-hover)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6 }}
              >
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google (Gemini)</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>API Key</label>
              <input 
                type="password"
                placeholder="sk-..."
                value={prefs.llmApiKey || ''}
                onChange={(e) => handleChange('llmApiKey', e.currentTarget.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--color-surface-hover)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6 }}
              />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 6 }}>
                Your API key is stored locally in your browser extension storage and is never sent to our servers. 
                Note: Extension storage is not fully secure against local access.
              </p>
            </div>
          </div>
        )}

        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '32px 0' }} />

        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Page Scanning</h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={prefs.hoverCardsEnabled}
              onChange={(e) => handleChange('hoverCardsEnabled', e.currentTarget.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: 15, fontWeight: 500 }}>Show Hover Cards</span>
          </label>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4, marginLeft: 30 }}>
            Automatically detect movie and TV show titles on web pages and display an interactive card when hovering over them.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.posterOverlaysEnabled ?? true}
              onChange={(e) => handleChange('posterOverlaysEnabled', e.currentTarget.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: 15, fontWeight: 500 }}>Show Poster Rating Badges</span>
          </label>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4, marginLeft: 30 }}>
            Overlay ratings and a quick-add button directly on movie posters while you browse.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Detection Sensitivity</label>
          <select
            value={prefs.detectionSensitivity || 'medium'}
            onChange={(e) => handleChange('detectionSensitivity', (e.target as HTMLSelectElement).value)}
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '8px 12px',
              background: 'var(--color-surface-hover)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="low">Low — TMDb CDN posters only</option>
            <option value="medium">Medium — CDN + alt text (recommended)</option>
            <option value="high">High — aggressive matching</option>
          </select>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 6 }}>
            Higher sensitivity finds more posters but may occasionally match non-movie images.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Disabled Domains</label>
          <textarea
            value={prefs.disabledDomains?.join('\n') || ''}
            onChange={(e) => handleChange('disabledDomains', e.currentTarget.value.split('\n').map(d => d.trim()).filter(Boolean))}
            placeholder={'example.com\nnews.ycombinator.com'}
            rows={3}
            style={{ width: '100%', padding: '10px', background: 'var(--color-surface-hover)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, resize: 'vertical' }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 6 }}>
            Hover cards will not appear on these domains. Enter one domain per line.
          </p>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '32px 0' }} />

        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Data Management</h3>
        
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <button 
            className="btn btn-secondary"
            onClick={handleExport}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            Export Library JSON
          </button>
          
          <label className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
            Import Library JSON
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={handleImport} 
            />
          </label>
        </div>

        <div style={{ marginTop: 32 }}>
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
