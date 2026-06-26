import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { SystemLog } from '@/shared/types';
import '../styles/settings.css';

export function Logs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('system_logs', (result) => {
        setLogs(result.system_logs || []);
      });
      
      const listener = (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
        if (namespace === 'local' && changes.system_logs) {
          setLogs(changes.system_logs.newValue || []);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const copyToClipboard = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Logs copied to clipboard!');
    }).catch((err) => {
      alert('Failed to copy logs: ' + err);
    });
  };

  const clearLogs = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ system_logs: [] });
    }
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
          <span className="sanctuary-subtitle">Archival Colophon</span>
        </div>
        <h2 className="sanctuary-title">System Inscriptions</h2>
        <p className="sanctuary-description">Telegraphic colophon recording internal projection warnings and mechanism anomalies.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <button style={btnGoldStyle} onClick={copyToClipboard}>
            Transcribe Colophon (Copy)
          </button>
          <button style={btnRestraintStyle} onClick={clearLogs}>
            Expunge Ledger
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-plaque)',
            border: '1px solid var(--border-restraint)',
            borderRadius: 4,
            padding: 28,
            backdropFilter: 'var(--blur-hero)'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 36, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-meta)' }}>
              No system inscriptions recorded in the sanctuary ledger.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-hero)', color: 'var(--text-meta)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Chronicle</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Designation</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice().reverse().map((log, i) => {
                    const isErr = log.level === 'error';
                    const isWarn = log.level === 'warn';
                    const levelColor = isErr ? 'rgb(255, 68, 68)' : isWarn ? 'rgb(255, 153, 0)' : 'rgb(74, 144, 226)';
                    const badgeBg = isErr ? 'rgba(255, 68, 68, 0.1)' : isWarn ? 'rgba(255, 153, 0, 0.1)' : 'hsla(0, 0%, 100%, 0.05)';
                    const badgeBorder = isErr ? 'rgba(255, 68, 68, 0.4)' : isWarn ? 'rgba(255, 153, 0, 0.4)' : 'var(--border-restraint)';

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-restraint)', color: isErr ? 'hsl(0, 60%, 80%)' : 'var(--text-reflection)' }}>
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: 'var(--text-meta)', fontSize: 12 }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 2,
                            background: badgeBg,
                            border: `1px solid ${badgeBorder}`,
                            color: levelColor,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.15em'
                          }}>
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', wordBreak: 'break-word', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
                          {log.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
