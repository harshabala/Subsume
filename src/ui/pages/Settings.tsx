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
      const res = await sendMessage<Record<string, unknown>, UserPreferences>(MessageType.GET_FULL_PREFERENCES, {});
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    }
    load();
  }, []);

  const handleChange = (key: keyof UserPreferences, value: unknown) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value as UserPreferences[keyof UserPreferences] });
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
      await getAuthToken(true);
      alert('Successfully connected to Google Drive!');
    } catch (e: unknown) {
      alert('Failed to connect to Google Drive: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleBackupNow = async () => {
    try {
      const res = await sendMessage(MessageType.EXPORT_LIBRARY, {});
      if (!res.success || !res.data) throw new Error('Failed to export local data');
      await uploadDatabaseBackup(JSON.stringify(res.data));
      alert('Backup successful!');
    } catch (e: unknown) {
      alert('Backup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const jsonString = await downloadDatabaseBackup();
      const raw = JSON.parse(jsonString);
      const data = validateImportData(raw);
      await sendMessage(MessageType.IMPORT_LIBRARY, data);
      alert('Restore successful!');
    } catch (e: unknown) {
      alert('Restore failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  if (!prefs) {
    return (
      <div className="page-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-meta)', padding: 48, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18 }}>
        Warming sanctuary instruments...
      </div>
    );
  }

  const inputStyle = {
    background: 'hsla(0, 0%, 100%, 0.03)',
    border: '1px solid var(--border-restraint)',
    color: 'var(--text-sanctuary)',
    borderRadius: 2,
    padding: '10px 14px',
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none'
  };

  const btnRestraintStyle = {
    background: 'transparent',
    border: '1px solid var(--border-restraint)',
    color: 'var(--text-reflection)',
    padding: '10px 20px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const btnGoldStyle = {
    background: 'var(--border-hero)',
    border: 'none',
    color: 'hsl(240, 18%, 5%)',
    padding: '12px 28px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const labelStyle = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: 'var(--text-meta)',
    marginBottom: 8,
    display: 'block'
  };

  const headingStyle = {
    fontFamily: 'var(--font-editorial)',
    fontStyle: 'italic',
    fontSize: 22,
    fontWeight: 400,
    color: 'var(--text-reflection)',
    margin: '0 0 24px 0',
    borderBottom: '1px solid var(--border-restraint)',
    paddingBottom: 12
  };

  return (
    <div className="page-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-artwork)', paddingBottom: 64 }}>
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Sanctuary Configuration</span>
        </div>
        <h2 className="sanctuary-title">Instrument Settings</h2>
        <p className="sanctuary-description">Configure the acoustic and visual restraints of your private cinematic sanctuary.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {/* Content Preferences */}
        <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 32, backdropFilter: 'var(--blur-hero)' }}>
          <h3 style={headingStyle}>Taxonomy & Curation Preferences</h3>
          
          <div style={{ marginBottom: 28 }}>
            <span style={labelStyle}>Archival Genres</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {AVAILABLE_GENRES.map(g => {
                const active = prefs.favoriteGenres.includes(g.id);
                return (
                  <label key={g.id} style={{ 
                    border: `1px solid ${active ? 'var(--border-hero)' : 'var(--border-restraint)'}`,
                    background: active ? 'hsla(43, 74%, 49%, 0.1)' : 'transparent',
                    color: active ? 'var(--border-hero)' : 'var(--text-artwork)',
                    padding: '6px 14px',
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <input 
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleArrayItem('favoriteGenres', g.id)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--border-hero)' : 'hsla(0,0%,100%,0.2)' }} />
                    {g.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <span style={labelStyle}>Sanctuary Platforms</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {AVAILABLE_PLATFORMS.map(p => {
                const active = prefs.platforms.includes(p.id);
                return (
                  <label key={p.id} style={{ 
                    border: `1px solid ${active ? 'var(--border-hero)' : 'var(--border-restraint)'}`,
                    background: active ? 'hsla(43, 74%, 49%, 0.1)' : 'transparent',
                    color: active ? 'var(--border-hero)' : 'var(--text-artwork)',
                    padding: '6px 14px',
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <input 
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleArrayItem('platforms', p.id)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--border-hero)' : 'hsla(0,0%,100%,0.2)' }} />
                    {p.name}
                  </label>
                );
              })}
            </div>
            <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--text-meta)', marginTop: 12 }}>Used to tailor your private curation feed.</p>
          </div>
        </div>

        {/* API Configuration */}
        <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 32, backdropFilter: 'var(--blur-hero)' }}>
          <h3 style={headingStyle}>Archive Credentials (API)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={labelStyle}>TMDb Archival Key</label>
              <input 
                type="password"
                placeholder="Enter TMDb v3 credential"
                value={prefs.tmdbApiKey || ''}
                onChange={(e) => handleChange('tmdbApiKey', e.currentTarget.value)}
                style={inputStyle}
              />
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-meta)', marginTop: 8 }}>
                Required for catalogue synchronization. Acquire credential at{' '}
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" style={{ color: 'var(--border-hero)', textDecoration: 'none' }}>themoviedb.org</a>.
              </p>
            </div>

            <div>
              <label style={labelStyle}>OMDb Archival Key (Optional)</label>
              <input
                type="password"
                placeholder="Enter OMDb credential"
                value={prefs.omdbApiKey || ''}
                onChange={(e) => handleChange('omdbApiKey', e.currentTarget.value)}
                style={inputStyle}
              />
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-meta)', marginTop: 8 }}>
                Enriches archival records with supplementary reception plates. Acquire credential at{' '}
                <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener" style={{ color: 'var(--border-hero)', textDecoration: 'none' }}>omdbapi.com</a>.
              </p>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 32, backdropFilter: 'var(--blur-hero)' }}>
          <h3 style={headingStyle}>Cognitive Reflection Engine</h3>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={prefs.llmEnabled}
                onChange={(e) => handleChange('llmEnabled', e.currentTarget.checked)}
                style={{ accentColor: 'var(--border-hero)', width: 16, height: 16 }}
              />
              <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-reflection)' }}>Engage cognitive synthesis for recommendations</span>
            </label>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-meta)', margin: '8px 0 0 30px', lineHeight: 1.5 }}>
              Invokes neural evaluation to assemble resonant cinematic pathways matching your private reflections.
            </p>
          </div>

          {prefs.llmEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 30, borderLeft: '1px solid var(--border-restraint)' }}>
              <div>
                <label style={labelStyle}>Neural Architecture</label>
                <select 
                  value={prefs.llmProvider || 'openai'}
                  onChange={(e) => handleChange('llmProvider', e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="openai" style={{ background: 'hsl(240, 18%, 8%)' }}>OpenAI (GPT-4 Sanctuary)</option>
                  <option value="anthropic" style={{ background: 'hsl(240, 18%, 8%)' }}>Anthropic (Claude Obscura)</option>
                  <option value="gemini" style={{ background: 'hsl(240, 18%, 8%)' }}>Google (Gemini Synthesis)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Primary Neural Credential</label>
                <input 
                  type="password"
                  placeholder="sk-..."
                  value={prefs.llmApiKey || ''}
                  onChange={(e) => handleChange('llmApiKey', e.currentTarget.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Fallback Credential</label>
                <input 
                  type="password"
                  placeholder="sk-..."
                  value={prefs.llmSecondaryApiKey || ''}
                  onChange={(e) => handleChange('llmSecondaryApiKey', e.currentTarget.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* Page Scanning */}
        <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 32, backdropFilter: 'var(--blur-hero)' }}>
          <h3 style={headingStyle}>Surface Inspection Instruments</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={prefs.hoverCardsEnabled}
                onChange={(e) => handleChange('hoverCardsEnabled', e.currentTarget.checked)}
                style={{ accentColor: 'var(--border-hero)', width: 16, height: 16 }}
              />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-artwork)' }}>Project Hover Inspection Cards</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.posterOverlaysEnabled ?? true}
                onChange={(e) => handleChange('posterOverlaysEnabled', e.currentTarget.checked)}
                style={{ accentColor: 'var(--border-hero)', width: 16, height: 16 }}
              />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-artwork)' }}>Superimpose Archival Badges on Posters</span>
            </label>

            <div>
              <label style={labelStyle}>Inspection Sensitivity</label>
              <select
                value={prefs.detectionSensitivity || 'medium'}
                onChange={(e) => handleChange('detectionSensitivity', (e.target as HTMLSelectElement).value)}
                style={inputStyle}
              >
                <option value="low" style={{ background: 'hsl(240, 18%, 8%)' }}>Restrained — CDN exact matching</option>
                <option value="medium" style={{ background: 'hsl(240, 18%, 8%)' }}>Standard — Archival balance</option>
                <option value="high" style={{ background: 'hsl(240, 18%, 8%)' }}>Omnipresent — Aggressive scanning</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Sanctuary Silenced Domains</label>
              <textarea
                value={prefs.disabledDomains?.join('\n') || ''}
                onChange={(e) => handleChange('disabledDomains', e.currentTarget.value.split('\n').map(d => d.trim()).filter(Boolean))}
                placeholder={'example.com\nnews.ycombinator.com'}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Cloud Sync & Data Management */}
        <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 32, backdropFilter: 'var(--blur-hero)' }}>
          <h3 style={headingStyle}>Preservation & Sync Colophon</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <span style={labelStyle}>Remote Storage</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                <button style={btnRestraintStyle} onClick={handleConnectDrive}>
                  Engage Google Drive
                </button>
                <button style={btnRestraintStyle} onClick={handleBackupNow}>
                  Execute Vault Backup
                </button>
                <button style={btnRestraintStyle} onClick={handleRestoreBackup}>
                  Restore from Vault
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-restraint)', paddingTop: 20 }}>
              <span style={labelStyle}>Local Archive Portability</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                <button style={btnRestraintStyle} onClick={handleExport}>
                  Export Ledger (JSON)
                </button>
                <label style={{ ...btnRestraintStyle, margin: 0 }}>
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

            <div style={{ borderTop: '1px solid var(--border-restraint)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button style={btnRestraintStyle} onClick={handleCheckUpdate} disabled={checkingUpdate}>
                  {checkingUpdate ? 'Inspecting...' : 'Check Instrument Version'}
                </button>
                {updateStatus && <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--border-hero)' }}>{updateStatus}</span>}
              </div>

              <button style={btnGoldStyle} onClick={save} disabled={saving}>
                {saving ? 'Engraving...' : 'Engrave Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
